from datetime import datetime, date, timedelta
import csv
import io
import xml.etree.ElementTree as ET
from app.extensions import db
from app.models import Startup, Account, AccountType, JournalEntry, JournalLine, BusinessMonthlyData
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, and_, extract, or_

DEFAULT_EXPENSE_ACCOUNTS = [
    "Advertising & Marketing",
    "Bank Charges & Fees",
    "Contractors",
    "Education & Training",
    "Employee Benefits",
    "Equipment Lease",
    "Insurance",
    "Legal & Professional Services",
    "Meals & Entertainment",
    "Office Supplies & Software",
    "Rent & Lease",
    "Repairs & Maintenance",
    "Salaries & Wages",
    "Taxes & Licenses",
    "Travel",
    "Utilities",
]

DEFAULT_INCOME_ACCOUNTS = [
    "Sales Revenue",
    "Service Revenue",
    "Other Income",
]

def initialize_accounting(startup_id, initial_accounts):
    """
    Initializes the accounting system for a startup.
    initial_accounts: List of dicts { 'name': 'Bank Name', 'balance': 1000.00 }
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        raise ValueError("Startup not found")
    
    if startup.accounting_initialized:
        raise ValueError("Accounting already initialized for this startup")

    try:
        # 1. Create Opening Balance Equity Account
        equity_account = Account(
            startup_id=startup_id,
            name="Opening Balance Equity",
            type=AccountType.EQUITY,
            subtype="Equity"
        )
        db.session.add(equity_account)
        db.session.flush() # Get ID

        # 2. Create Bank Accounts and Opening Balances
        journal_lines = []
        total_opening_balance = 0

        for acc_data in initial_accounts:
            bank_account = Account(
                startup_id=startup_id,
                name=acc_data['name'],
                type=AccountType.ASSET,
                subtype="Bank",
                balance=acc_data['balance']
            )
            db.session.add(bank_account)
            db.session.flush()

            balance = float(acc_data['balance'])
            if balance > 0:
                # Debit Bank, Credit Equity
                journal_lines.append(JournalLine(account_id=bank_account.id, debit=balance, credit=0))
                total_opening_balance += balance
            elif balance < 0:
                # Credit Bank, Debit Equity (unlikely for opening bank, but possible for overdraft)
                journal_lines.append(JournalLine(account_id=bank_account.id, debit=0, credit=abs(balance)))
                total_opening_balance += balance # Adds negative number

        # Complete Opening Balance Entry
        if total_opening_balance != 0:
            if total_opening_balance > 0:
                 journal_lines.append(JournalLine(account_id=equity_account.id, debit=0, credit=total_opening_balance))
            else:
                 journal_lines.append(JournalLine(account_id=equity_account.id, debit=abs(total_opening_balance), credit=0))
            
            # Create Journal Entry
            entry = JournalEntry(
                startup_id=startup_id,
                date=datetime.utcnow().date(),
                description="Opening Balance",
                reference="INIT"
            )
            entry.lines = journal_lines
            db.session.add(entry)
            
            # Update Equity Balance
            # Equity increases with Credit. If total_opening_balance > 0, we Credited Equity.
            equity_account.balance = total_opening_balance 


        # 3. Create Default Accounts
        for name in DEFAULT_EXPENSE_ACCOUNTS:
            db.session.add(Account(startup_id=startup_id, name=name, type=AccountType.EXPENSE, subtype="Expense"))
        
        for name in DEFAULT_INCOME_ACCOUNTS:
            db.session.add(Account(startup_id=startup_id, name=name, type=AccountType.INCOME, subtype="Income"))

        # Default Liability Accounts
        db.session.add(Account(startup_id=startup_id, name="Accounts Payable", type=AccountType.LIABILITY, subtype="Current Liability"))
        db.session.add(Account(startup_id=startup_id, name="Accounts Receivable", type=AccountType.ASSET, subtype="Current Asset"))

        # Default Cash Account
        db.session.add(Account(startup_id=startup_id, name="Petty Cash", type=AccountType.ASSET, subtype="Cash", balance=0.00))

        startup.accounting_initialized = True
        db.session.commit()
        return {"message": "Accounting initialized successfully"}

    except Exception as e:
        db.session.rollback()
        raise e

def get_accounts(startup_id):
    return Account.query.filter_by(startup_id=startup_id).all()

def get_journal_entries(startup_id):
    return JournalEntry.query.filter_by(startup_id=startup_id).order_by(JournalEntry.date.desc()).all()


def create_manual_journal_entry(startup_id, data):
    """
    Creates a detailed manual journal entry.
    data: {
        'date': 'YYYY-MM-DD',
        'description': '...',
        'reference': '...',
        'lines': [
            { 'account_id': 1, 'debit': 100, 'credit': 0, 'description': '...', 'quantity': 5, 'business_model_id': 2 },
            ...
        ]
    }
    """
    try:
        entry = JournalEntry(
            startup_id=startup_id,
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            description=data.get('description'),
            reference=data.get('reference')
        )

        total_debit = 0
        total_credit = 0
        lines = []

        for line_data in data['lines']:
            debit = float(line_data.get('debit', 0))
            credit = float(line_data.get('credit', 0))
            total_debit += debit
            total_credit += credit
            
            lines.append(JournalLine(
                account_id=line_data['account_id'],
                debit=debit,
                credit=credit,
                description=line_data.get('description'),
                business_model_id=line_data.get('business_model_id'),
                quantity=float(line_data.get('quantity', 0))
            ))
            
            # Update Account Balance
            account = Account.query.get(line_data['account_id'])
            if not account or account.startup_id != startup_id:
                raise ValueError(f"Invalid account ID: {line_data['account_id']}")
            
            # Asset/Expense: Debit increases, Credit decreases
            if account.type in [AccountType.ASSET, AccountType.EXPENSE]:
                account.balance = float(account.balance) + debit - credit
            # Liability/Equity/Income: Credit increases, Debit decreases
            else:
                account.balance = float(account.balance) + credit - debit

        if abs(total_debit - total_credit) > 0.01: # Floating point tolerance
            raise ValueError(f"Journal entry is not balanced. Debit: {total_debit}, Credit: {total_credit}")

        entry.lines = lines
        db.session.add(entry)
        db.session.commit()

        # Auto-calculate monthly metrics
        try:
            update_monthly_metrics(startup_id, entry.date)
        except:
            pass # Fail silently for background update

        return entry

    except Exception as e:
        db.session.rollback()
        raise e

def create_simple_transaction(startup_id, data):
    """
    Helper to create income/expense transactions easily.
    data: {
        'type': 'INCOME' | 'EXPENSE',
        'date': 'YYYY-MM-DD',
        'amount': 100.00,
        'account_id': 123, # The Expense or Income account
        'bank_account_id': 456, # The Bank account
        'description': '...',
        'business_model_id': 12, # Optional: Allocation
        'quantity': 5 # Optional: Units
    }
    """
    txn_type = data['type'] # INCOME or EXPENSE
    amount = float(data['amount'])
    date_str = data['date']
    category_account_id = data['account_id']
    bank_account_id = data['bank_account_id']
    description = data.get('description')
    reference = data.get('reference', txn_type) # Default to type if no ref provided
    
    business_model_id = data.get('business_model_id')
    quantity = data.get('quantity', 0)

    journal_data = {
        'date': date_str,
        'description': description,
        'reference': reference,
        'lines': []
    }

    if txn_type == 'EXPENSE':
        # Debit Expense (ALLOCATION LINE), Credit Bank
        journal_data['lines'].append({
            'account_id': category_account_id, 
            'debit': amount, 
            'credit': 0, 
            'description': description,
            'business_model_id': business_model_id,
            'quantity': quantity
        })
        journal_data['lines'].append({
            'account_id': bank_account_id, 
            'debit': 0, 
            'credit': amount, 
            'description': description
        })
    
    elif txn_type == 'INCOME':
        # Debit Bank, Credit Income (ALLOCATION LINE)
        journal_data['lines'].append({
            'account_id': bank_account_id, 
            'debit': amount, 
            'credit': 0, 
            'description': description
        })
        journal_data['lines'].append({
            'account_id': category_account_id, 
            'debit': 0, 
            'credit': amount, 
            'description': description,
            'business_model_id': business_model_id,
            'quantity': quantity
        })
    
    return create_manual_journal_entry(startup_id, journal_data)


def create_account(startup_id, data):
    """
    Creates a new account.
    data: {
        'name': 'Account Name',
        'type': 'ASSET',
        'subtype': 'Bank',
        'initial_balance': 0.00 (optional)
    }
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        raise ValueError("Startup not found")

    try:
        # Create the account
        new_account = Account(
            startup_id=startup_id,
            name=data['name'],
            type=AccountType(data['type']),
            subtype=data.get('subtype')
        )
        db.session.add(new_account)
        db.session.flush()

        # Handle Initial Balance (if any)
        initial_balance = float(data.get('initial_balance', 0))
        if initial_balance != 0:
            # Find Equity Account for opening balance offset
            equity_account = Account.query.filter_by(
                startup_id=startup_id, 
                name="Opening Balance Equity", 
                type=AccountType.EQUITY
            ).first()
            
            if not equity_account:
                # Fallback if somehow missing
                equity_account = Account(
                    startup_id=startup_id,
                    name="Opening Balance Equity",
                    type=AccountType.EQUITY,
                    subtype="Equity"
                )
                db.session.add(equity_account)
                db.session.flush()

            # Create Journal Entry for Opening Balance
            entry = JournalEntry(
                startup_id=startup_id,
                date=datetime.utcnow().date(),
                description=f"Opening Balance for {new_account.name}",
                reference="Opening Balance"
            )
            db.session.add(entry)
            db.session.flush()

            # Debit Asset/Expense, Credit Equity/Liability/Income (simplified for Bank/Asset)
            # Assuming Bank/Petty Cash (Asset) -> Debit increases
            
            if new_account.type == AccountType.ASSET:
                if initial_balance > 0:
                    lines = [
                        JournalLine(journal_entry_id=entry.id, account_id=new_account.id, debit=initial_balance, credit=0),
                        JournalLine(journal_entry_id=entry.id, account_id=equity_account.id, debit=0, credit=initial_balance)
                    ]
                else:
                    lines = [
                        JournalLine(journal_entry_id=entry.id, account_id=new_account.id, debit=0, credit=abs(initial_balance)),
                        JournalLine(journal_entry_id=entry.id, account_id=equity_account.id, debit=abs(initial_balance), credit=0)
                    ]
            else:
                 # Generic fallback (Liability/Equity/Income normally Credit increases)
                 # For simplicity focusing on Asset creation as requested
                 if initial_balance > 0:
                     lines = [
                        JournalLine(journal_entry_id=entry.id, account_id=new_account.id, debit=0, credit=initial_balance),
                        JournalLine(journal_entry_id=entry.id, account_id=equity_account.id, debit=initial_balance, credit=0)
                    ]
            
            for line in lines:
                db.session.add(line)
            
            # Update balances
            new_account.balance = initial_balance
            # Equity balance update is skipped here for brevity but handled in full system if needed
            # actually we should update equity too if tracking it strictly
            equity_account.balance = float(equity_account.balance) + (float(lines[1].credit) - float(lines[1].debit))

        db.session.commit()
        return new_account.to_dict()

    except Exception as e:
        db.session.rollback()
        raise e

def update_monthly_metrics(startup_id, txn_date):
    """
    Recalculates and updates BusinessMonthlyData for the specific month of the transaction.
    txn_date: date object or string 'YYYY-MM-DD'
    """
    if isinstance(txn_date, str):
        txn_date = datetime.strptime(txn_date, '%Y-%m-%d').date()
    
    # define month start and end
    month_start = txn_date.replace(day=1)
    # Get last day of month
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    month_end = next_month - timedelta(days=1)

    try:
        # 1. Total Revenue (Income Accounts)
        revenue_stmt = db.session.query(func.sum(JournalLine.credit - JournalLine.debit))\
            .join(Account)\
            .join(JournalEntry)\
            .filter(
                JournalEntry.startup_id == startup_id,
                JournalEntry.date >= month_start,
                JournalEntry.date <= month_end,
                Account.type == AccountType.INCOME
            )
        total_revenue = revenue_stmt.scalar() or 0

        # 2. Total Expenses (Expense Accounts)
        expense_stmt = db.session.query(func.sum(JournalLine.debit - JournalLine.credit))\
            .join(Account)\
            .join(JournalEntry)\
            .filter(
                JournalEntry.startup_id == startup_id,
                JournalEntry.date >= month_start,
                JournalEntry.date <= month_end,
                Account.type == AccountType.EXPENSE
            )
        total_expenses = expense_stmt.scalar() or 0

        # 3. Net Burn (Expenses - Revenue, but typically Burn is just negative cash flow)
        # Using simple Net Loss definition here as Net Burn
        net_burn = float(total_expenses) - float(total_revenue)

        # 4. Cash in Bank (End of Month Snapshot)
        # Sum of all debits-credits for Asset/Bank accounts up to month_end
        cash_stmt = db.session.query(func.sum(JournalLine.debit - JournalLine.credit))\
            .join(Account)\
            .join(JournalEntry)\
            .filter(
                JournalEntry.startup_id == startup_id,
                JournalEntry.date <= month_end,
                Account.type == AccountType.ASSET,
                or_(Account.subtype == 'Bank', Account.name.ilike('%cash%'), Account.name.ilike('%petty%'))
            )
        cash_in_bank = cash_stmt.scalar() or 0

        # 5. Upsert BusinessMonthlyData
        monthly_data = BusinessMonthlyData.query.filter_by(
            startup_id=startup_id,
            month_start=month_start
        ).first()

        startup = Startup.query.get(startup_id)
        if not startup: 
            return # Should not happen

        if not monthly_data:
            monthly_data = BusinessMonthlyData(
                startup_id=startup_id,
                month_start=month_start,
                created_by=startup.user_id # Default to owner
            )
            db.session.add(monthly_data)

        # Update fields
        monthly_data.total_revenue = total_revenue
        monthly_data.total_expenses = total_expenses
        monthly_data.net_burn = net_burn
        monthly_data.cash_in_bank = cash_in_bank
        
        # MRR approximation: For now equal to Revenue (can be refined if subscriptions are tracked separately)
        monthly_data.mrr = total_revenue 

        db.session.commit()
    
    except Exception as e:
        print(f"Error updating monthly metrics: {e}")
        # Don't fail the transaction if metrics fail, just log it.
        # But we might want to know... for now silent fail to avoid blocking user.
        db.session.rollback()

def import_transactions_from_csv(startup_id, file_stream):
    """
    Imports transactions from a CSV file.
    Expected headers: Date, Type, Amount, Payment Account, Category, Description, Reference
    """
    stream = io.StringIO(file_stream.read().decode("UTF8"), newline=None)
    csv_input = csv.DictReader(stream)
    
    success_count = 0
    errors = []
    
    # Cache accounts for lookup
    all_accounts = Account.query.filter_by(startup_id=startup_id).all()
    account_map = {acc.name.lower(): acc for acc in all_accounts}

    row_index = 0
    for row in csv_input:
        row_index += 1
        try:
            # Basic validation
            date_str = row.get('Date', '').strip()
            txn_type = row.get('Type', '').strip().upper()
            amount_str = row.get('Amount', '').strip()
            payment_acc_name = row.get('Payment Account', '').strip()
            category_acc_name = row.get('Category', '').strip()
            description = row.get('Description', '').strip()
            reference = row.get('Reference', '').strip()

            if not all([date_str, txn_type, amount_str, payment_acc_name, category_acc_name]):
                raise ValueError("Missing required fields")

            # Lookup Accounts
            payment_acc = account_map.get(payment_acc_name.lower())
            if not payment_acc:
                # Try partial match or alias? For now strict.
                raise ValueError(f"Payment Account '{payment_acc_name}' not found")

            category_acc = account_map.get(category_acc_name.lower())
            if not category_acc:
                raise ValueError(f"Category Account '{category_acc_name}' not found")

            # Prepare data
            data = {
                'type': txn_type,
                'date': date_str,
                'amount': float(amount_str),
                'account_id': category_acc.id,
                'bank_account_id': payment_acc.id,
                'description': description,
                'reference': reference
            }

            create_simple_transaction(startup_id, data)
            success_count += 1

        except Exception as e:
            errors.append(f"Row {row_index}: {str(e)}")

    return {
        'success_count': success_count,
        'errors': errors
    }

def import_transactions_from_tally(startup_id, file_stream):
    """
    Imports transactions from Tally XML Export (Day Book).
    """
    try:
        content = file_stream.read()
        # Tally exports often in UTF-16LE or UTF-8. Try decoding.
        try:
            xml_content = content.decode('utf-8')
        except UnicodeDecodeError:
            xml_content = content.decode('utf-16')
            
        root = ET.fromstring(xml_content)
    except Exception as e:
        return {'success_count': 0, 'errors': [f"Invalid XML or Encoding: {str(e)}"]}
    
    success_count = 0
    errors = []
    
    # Cache accounts
    all_accounts = Account.query.filter_by(startup_id=startup_id).all()
    account_map = {acc.name.lower(): acc for acc in all_accounts}

    # Find Vouchers - Support both Envelope structure and direct list
    vouchers = root.findall('.//VOUCHER')
    
    for i, voucher in enumerate(vouchers):
        try:
            # Extract Date
            date_val = voucher.findtext('DATE')
            if date_val and len(date_val) >= 8:
                 # YYYYMMDD
                 txn_date = datetime.strptime(date_val[:8], '%Y%m%d').date()
            else:
                 # Try finding effective date?
                 continue

            narration = voucher.findtext('NARRATION') or f"Tally Import {i+1}"
            vch_type = voucher.findtext('VOUCHERTYPENAME') or 'Journal'
            
            # Ledger Entries
            entries = voucher.findall('.//ALLLEDGERENTRIES.LIST')
            if not entries:
                 entries = voucher.findall('.//LEDGERENTRIES.LIST')
            
            lines = []
            
            for entry in entries:
                ledger_name = entry.findtext('LEDGERNAME')
                amount_str = entry.findtext('AMOUNT')
                
                if not ledger_name or not amount_str:
                    continue
                    
                amount = float(amount_str)
                # Tally Logic: Negative is usually Credit, Positive is Debit (BUT this depends on view/export)
                # Standard XML export: Credit is negative.
                
                account = account_map.get(ledger_name.lower())
                if not account:
                    # Optional: Create account dynamically? 
                    # For now, strict mapping.
                    # Or try to match closely?
                    raise ValueError(f"Ledger '{ledger_name}' not found in system accounts.")
                
                if amount < 0:
                    # Credit
                    lines.append({
                        'account_id': account.id,
                        'debit': 0,
                        'credit': abs(amount),
                        'description': narration,
                        'quantity': 0
                    })
                else:
                    # Debit
                    lines.append({
                        'account_id': account.id,
                        'debit': amount,
                        'credit': 0,
                        'description': narration,
                        'quantity': 0
                    })
            
            if lines:
                # Check balance
                total_debit = sum(l['debit'] for l in lines)
                total_credit = sum(l['credit'] for l in lines)
                
                if abs(total_debit - total_credit) > 0.01:
                    # Unbalanced. Tally sometimes has implicit entries?
                    # For now, simplistic handling.
                    # Add a balancing line to Equity or Suspense?
                    # Let's skip invalid vouchers
                    raise ValueError(f"Unbalanced voucher: Dr {total_debit} != Cr {total_credit}")

                create_manual_journal_entry(startup_id, {
                    'date': txn_date.strftime('%Y-%m-%d'),
                    'description': f"{vch_type}: {narration}",
                    'reference': 'Tally',
                    'lines': lines
                })
                success_count += 1
                
        except Exception as e:
            errors.append(f"Voucher {i+1}: {str(e)}")

    return {
        'success_count': success_count,
        'errors': errors[:50] # Cap errors
    }
