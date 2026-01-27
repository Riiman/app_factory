from decimal import Decimal

class ScenarioService:
    @staticmethod
    def calculate_dilution(current_cap_table, new_investment_amount, pre_money_valuation):
        """
        Calculates the impact of a new funding round on the cap table.
        
        Args:
            current_cap_table (list[dict]): List of dicts with 'shares', 'stakeholder_name'.
            new_investment_amount (float): Amount being raised.
            pre_money_valuation (float): Valuation before the raise.
            
        Returns:
            dict: Calculation results including post-money val, new share price, and updated ownerships.
        """
        total_pre_money_shares = sum(entry['shares'] for entry in current_cap_table)
        
        if total_pre_money_shares == 0:
            return {
                "error": "Total shares cannot be zero."
            }

        # Calculate Share Price based on Pre-Money
        # Pre-Money Val = Share Price * Total Pre-Money Shares
        if pre_money_valuation > 0:
             share_price = pre_money_valuation / total_pre_money_shares
        else:
             # Fallback if no valuation (e.g. first round), maybe use par value logic or simplified
             share_price = 1.0 

        # New Shares Issued = Investment / Share Price
        new_shares_issued = int(new_investment_amount / share_price) if share_price > 0 else 0
        
        total_post_money_shares = total_pre_money_shares + new_shares_issued
        post_money_valuation = pre_money_valuation + new_investment_amount
        
        # Calculate Ownerships
        updated_ownership = []
        
        # Existing Stakeholders (Diluted)
        for entry in current_cap_table:
            ownership_pct = (entry['shares'] / total_post_money_shares) * 100
            updated_ownership.append({
                "stakeholder_name": entry['stakeholder_name'],
                "shares": entry['shares'],
                "ownership_percentage": round(ownership_pct, 2),
                "value": round(entry['shares'] * share_price, 2), # Value remains same pre-dilution roughly in total? No, value usually goes up or stays same, percentage goes down. 
                # Actually Post-Money Value = Shares * New Share Price (which is same as Pre-Money Share Price in this simple model)
                "post_money_value": round(entry['shares'] * share_price, 2)
            })
            
        # New Investor
        new_investor_ownership_pct = (new_shares_issued / total_post_money_shares) * 100
        updated_ownership.append({
            "stakeholder_name": "New Investors",
            "shares": new_shares_issued,
            "ownership_percentage": round(new_investor_ownership_pct, 2),
            "post_money_value": round(new_investment_amount, 2),
            "is_new": True
        })
        
        return {
            "pre_money_valuation": pre_money_valuation,
            "post_money_valuation": post_money_valuation,
            "share_price": round(share_price, 2),
            "total_shares": total_post_money_shares,
            "dilution_percentage": round((1 - (total_pre_money_shares / total_post_money_shares)) * 100, 2),
            "cap_table": updated_ownership
        }
