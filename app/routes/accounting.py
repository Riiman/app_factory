from flask import Blueprint, request, jsonify
from app.services import accounting_service
from app.models import Startup

accounting_bp = Blueprint('accounting', __name__)

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/setup', methods=['POST'])
def setup_accounting(startup_id):
    try:
        data = request.get_json()
        initial_accounts = data.get('initial_accounts') # List of {name, balance}
        if not initial_accounts:
            return jsonify({'error': 'Initial accounts are required'}), 400

        result = accounting_service.initialize_accounting(startup_id, initial_accounts)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/accounts', methods=['GET'])
def get_accounts(startup_id):
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        accounts = accounting_service.get_accounts(startup_id)
        return jsonify([acc.to_dict(month=month, year=year) for acc in accounts]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/accounts', methods=['POST'])
def create_account(startup_id):
    try:
        data = request.get_json()
        if not data.get('name') or not data.get('type'):
             return jsonify({'error': 'Name and Type are required'}), 400
             
        new_account = accounting_service.create_account(startup_id, data)
        return jsonify(new_account), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/journal', methods=['GET'])
def get_journal_entries(startup_id):
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        entries = accounting_service.get_journal_entries(startup_id, month=month, year=year)
        return jsonify([entry.to_dict() for entry in entries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/journal', methods=['POST'])
def create_journal_entry(startup_id):
    try:
        data = request.get_json()
        entry = accounting_service.create_manual_journal_entry(startup_id, data)
        return jsonify(entry.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/transaction', methods=['POST'])
def create_transaction(startup_id):
    try:
        data = request.get_json()
        entry = accounting_service.create_simple_transaction(startup_id, data)
        return jsonify(entry.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/import-transactions', methods=['POST'])
def import_transactions(startup_id):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        source = request.form.get('source', 'standard')

        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if source == 'tally':
            # Allow XML (or limit extensions if strictly needed, but Tally exports are widely varied in naming)
            # Usually .xml
            if not (file.filename.lower().endswith('.xml') or file.filename.lower().endswith('.txt') or file.filename.lower().endswith('.csv')):
                 return jsonify({'error': 'Tally import requires XML or specific format'}), 400

            result = accounting_service.import_transactions_from_tally(startup_id, file)
        else:
            if not file.filename.lower().endswith('.csv'):
                 return jsonify({'error': 'File must be a CSV'}), 400

            result = accounting_service.import_transactions_from_csv(startup_id, file)
        
        if result['success_count'] == 0 and result['errors']:
             return jsonify(result), 400
             
        return jsonify(result), 200
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/journal-lines/<int:line_id>', methods=['PATCH'])
def update_journal_line_allocation(startup_id, line_id):
    try:
        data = request.get_json()
        business_model_id = data.get('business_model_id')
        
        # Call service (or do it inline if service method doesn't exist yet, but better to add service method)
        # For speed, I'll do it inline here since I can import db models
        from app.models import JournalLine, JournalEntry
        from app import db
        
        line = JournalLine.query.get_or_404(line_id)
        
        # Verify ownership via journal entry
        entry = JournalEntry.query.get(line.journal_entry_id)
        if entry.startup_id != startup_id:
             return jsonify({'error': 'Unauthorized'}), 403
             
        line.business_model_id = business_model_id
        db.session.commit()
        
        return jsonify(line.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/api/startups/<int:startup_id>/accounting/accounts/<int:account_id>', methods=['PATCH'])
def update_account(startup_id, account_id):
    try:
        data = request.get_json()
        updated_account = accounting_service.update_account(startup_id, account_id, data)
        return jsonify(updated_account), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
