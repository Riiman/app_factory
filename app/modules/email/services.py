import poplib
import imaplib
import smtplib
import base64
import ssl
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.modules.email.models import EmailProvider, EmailProtocol
from app.extensions import oauth, db
from datetime import datetime

# ... (imports remain same)

class EmailService:
    def __init__(self, integration):
        self.integration = integration

    def _generate_xoauth2_string(self, user, token):
        auth_string = f"user={user}\1auth=Bearer {token}\1\1"
        return auth_string

    def _refresh_access_token(self):
        """Refreshes the OAuth access token."""
        print("DEBUG: Refreshing access token...")
        try:
            if self.integration.provider == EmailProvider.GOOGLE:
                client = oauth.google
            elif self.integration.provider == EmailProvider.OUTLOOK:
                client = oauth.microsoft
            else:
                 return None

            token = client.fetch_access_token(
                grant_type='refresh_token',
                refresh_token=self.integration.refresh_token
            )
            
            if token and token.get('access_token'):
                print("DEBUG: Token refreshed successfully")
                self.integration.access_token = token.get('access_token')
                self.integration.refresh_token = token.get('refresh_token', self.integration.refresh_token) # Update if new one provided
                if token.get('expires_at'):
                    self.integration.token_expires_at = datetime.fromtimestamp(token.get('expires_at'))
                
                db.session.add(self.integration)
                db.session.commit()
                return self.integration.access_token
                
        except Exception as e:
            print(f"DEBUG: Token Refresh Failed: {e}")
            import traceback
            traceback.print_exc()
        
        return None

    def _get_pop3_connection(self):
        """Establishes a POP3 connection."""
        if self.integration.provider == EmailProvider.CUSTOM:
            host = self.integration.imap_host # Reusing field for host
            port = self.integration.imap_port # Reusing field for port
            user = self.integration.username
            password = self.integration.get_password()
            
            try:
                print(f"DEBUG: Connecting to POP3 {host}:{port} for {user}")
                # POP3_SSL is usually on 995. If port is 110, use POP3()
                if port == 995:
                    print("DEBUG: Using POP3_SSL")
                    pop = poplib.POP3_SSL(host, port)
                else:
                    print("DEBUG: Using plain POP3")
                    pop = poplib.POP3(host, port)
                
                print(f"DEBUG: POP3 Welcome: {pop.getwelcome()}")
                pop.user(user)
                pop.pass_(password)
                return pop
            except Exception as e:
                print(f"DEBUG: POP3 Error: {e}")
                import traceback
                traceback.print_exc()
                
                # Smart Retry: If EOF and we weren't already using SSL on 995, try SSL
                # This handles cases where user enters non-995 port but server requires SSL
                if 'EOF' in str(e) or 'Connection reset' in str(e) or 'forcibly closed' in str(e):
                    if port != 995:
                        print("DEBUG: Connection closed unexpectedly. Retrying with SSL...")
                        try:
                            pop = poplib.POP3_SSL(host, port)
                            pop.user(user)
                            pop.pass_(password)
                            return pop
                        except Exception as e2:
                            print(f"DEBUG: Retry with SSL failed: {e2}")
                            # Check if we connected to an IMAP server by mistake
                            e2_str = str(e2)
                            if "Gimap ready" in e2_str or "* OK" in e2_str:
                                raise Exception(f"Configuration Error: You are connecting to an IMAP server ({host}) but selected POP3. Please change Protocol to IMAP or Host to pop.gmail.com")
                            raise e2
                
                # Check original error too
                if "Gimap ready" in str(e) or "* OK" in str(e):
                     raise Exception(f"Configuration Error: You are connecting to an IMAP server ({host}) but selected POP3. Please change Protocol to IMAP or Host to pop.gmail.com")

                raise Exception(f"POP3 Connection Failed: {str(e)}")
        
        raise Exception("POP3 only supported for Custom Provider")

    def _get_imap_connection(self):
        # ... (IMAP connection logic remains mostly same, maybe check protocol if needed but Routes handles creation)
        # For safety, let's ensure we only do IMAP things if protocol is IMAP
        if self.integration.incoming_protocol == EmailProtocol.POP3:
             raise Exception("Cannot use IMAP connection for POP3 integration")
        
        # ... (Original IMAP logic)
        """Establishes an IMAP connection based on provider."""
        if self.integration.provider == EmailProvider.CUSTOM:
            # ... (Original Custom IMAP logic)
            host = self.integration.imap_host
            port = self.integration.imap_port
            user = self.integration.username
            password = self.integration.get_password()
            
            context = ssl.create_default_context()
            try:
                mail = imaplib.IMAP4_SSL(host, port, ssl_context=context)
                mail.login(user, password)
                return mail
            except Exception as e:
                raise Exception(f"IMAP Connection Failed: {str(e)}")

        elif self.integration.provider in [EmailProvider.GOOGLE, EmailProvider.OUTLOOK]:
            # ... (Original OAuth IMAP logic)
            host = "imap.gmail.com" if self.integration.provider == EmailProvider.GOOGLE else "outlook.office365.com"
            port = 993
            user = self.integration.email_address
            token = self.integration.access_token 
            
            try:
                print(f"DEBUG: Connecting to IMAP {host}:{port} for {user}")
                mail = imaplib.IMAP4_SSL(host, port)
                auth_string = self._generate_xoauth2_string(user, token)
                print(f"DEBUG: Authenticating with XOAUTH2...")
                mail.authenticate('XOAUTH2', lambda x: auth_string.encode('utf-8'))
                print("DEBUG: Authentication successful")
                return mail
            except Exception as e:
                 print(f"DEBUG: IMAP Auth Error: {e}")
                 # Detect Auth Failure and Retry
                 if 'AUTHENTICATIONFAILED' in str(e) or 'Invalid credentials' in str(e):
                      print("DEBUG: Access Token expired. Attempting refresh...")
                      new_token = self._refresh_access_token()
                      if new_token:
                           print("DEBUG: Retry with new token...")
                           try:
                                mail = imaplib.IMAP4_SSL(host, port)
                                auth_string = self._generate_xoauth2_string(user, new_token)
                                mail.authenticate('XOAUTH2', lambda x: auth_string.encode('utf-8'))
                                return mail
                           except Exception as e2:
                                print(f"DEBUG: Retry Failed: {e2}")
                                raise e2
                 
                 import traceback
                 traceback.print_exc()
                 raise Exception(f"IMAP OAuth Connection Failed: {str(e)}")
        
        raise Exception("Unknown Provider")

    def _get_smtp_connection(self):
        """Establishes an SMTP connection."""
        if self.integration.provider == EmailProvider.CUSTOM:
            host = self.integration.smtp_host
            port = self.integration.smtp_port
            user = self.integration.username
            password = self.integration.get_password()
            
            try:
                server = smtplib.SMTP(host, port)
                server.starttls()
                server.login(user, password)
                return server
            except Exception as e:
                raise Exception(f"SMTP Connection Failed: {str(e)}")

        elif self.integration.provider in [EmailProvider.GOOGLE, EmailProvider.OUTLOOK]:
            host = "smtp.gmail.com" if self.integration.provider == EmailProvider.GOOGLE else "smtp.office365.com"
            port = 587
            user = self.integration.email_address
            token = self.integration.access_token
            
            try:
                print(f"DEBUG: Connecting to SMTP {host}:{port} for {user}")
                server = smtplib.SMTP(host, port)
                server.starttls()
                server.ehlo()
                
                auth_string = self._generate_xoauth2_string(user, token)
                # Standard SMTP XOAUTH2 command
                server.docmd('AUTH', 'XOAUTH2 ' + base64.b64encode(auth_string.encode()).decode())
                
                return server
            except Exception as e:
                 print(f"DEBUG: SMTP Auth Error: {e}")
                 # Retry logic
                 # SMTP Auth error is usually smtplib.SMTPAuthenticationError for bad creds
                 if '535' in str(e) or 'Authentication unsuccessful' in str(e):
                      print("DEBUG: Access Token expired (SMTP). Attempting refresh...")
                      new_token = self._refresh_access_token()
                      if new_token:
                           print("DEBUG: Retry SMTP with new token...")
                           try:
                                server = smtplib.SMTP(host, port)
                                server.starttls()
                                server.ehlo()
                                auth_string = self._generate_xoauth2_string(user, new_token)
                                server.docmd('AUTH', 'XOAUTH2 ' + base64.b64encode(auth_string.encode()).decode())
                                return server
                           except Exception as e2:
                                print(f"DEBUG: SMTP Retry Failed: {e2}")
                                raise e2
                 raise Exception(f"SMTP OAuth Connection Failed: {str(e)}")
        
        raise Exception("Unknown Provider")



    def list_folders(self):
        """Returns a list of folders."""
        if self.integration.incoming_protocol == EmailProtocol.POP3:
            # POP3 doesn't support folders, just "INBOX"
            return ["INBOX"]

        mail = self._get_imap_connection()
        try:
            status, folders = mail.list()
            # ... (Original parsing logic)
            folder_list = []
            if status == 'OK':
                for folder in folders:
                    # Simplified parsing
                    if ' "' in folder.decode():
                         name = folder.decode().split(' "')[-1].replace('"', '')
                    else:
                         name = folder.decode().split(' ')[-1]
                    
                    folder_list.append(name)
            return folder_list
        finally:
            try:
                mail.logout()
            except:
                pass

    def fetch_emails(self, folder="INBOX", page=1, limit=20):
        """Fetches latest emails with pagination."""
        if self.integration.incoming_protocol == EmailProtocol.POP3:
             return self._fetch_emails_pop3(page, limit)
        
        return self._fetch_emails_imap(folder, page, limit)

    def _fetch_emails_pop3(self, page=1, limit=20):
        pop = self._get_pop3_connection()
        try:
            # Get message count
            numMessages = len(pop.list()[1])
            
            # Calculate range for pagination (Newest first)
            # Page 1: [numMessages, numMessages - limit + 1]
            end = numMessages - (page - 1) * limit
            start = max(1, end - limit + 1)
            
            if end < 1:
                return []
            
            email_list = []
            
            # Iterate backwards from end to start
            for i in range(end, start - 1, -1):
                try:
                    # Retr returns (response, lines, octets)
                    resp, lines, octets = pop.retr(i)
                    msg_content = b'\r\n'.join(lines)
                    msg = email.message_from_bytes(msg_content)
                    
                    subject = msg['subject']
                    sender = msg['from']
                    date = msg['date']
                    
                    # Body extraction
                    body_text = ""
                    body_html = ""
                    
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            if "attachment" not in content_disposition:
                                if content_type == "text/plain" and not body_text:
                                    body_text = part.get_payload(decode=True).decode(errors='ignore')
                                elif content_type == "text/html" and not body_html:
                                    body_html = part.get_payload(decode=True).decode(errors='ignore')
                    else:
                        content_type = msg.get_content_type()
                        payload = msg.get_payload(decode=True).decode(errors='ignore')
                        if content_type == "text/html":
                            body_html = payload
                        else:
                            body_text = payload

                    # Threading headers
                    message_id = msg.get('Message-ID', '')
                    references = msg.get('References', '')
                    in_reply_to = msg.get('In-Reply-To', '')

                    email_list.append({
                        'id': i,
                        'subject': str(subject),
                        'from': str(sender),
                        'date': str(date),
                        'snippet': (body_text[:100] + '...') if body_text else (body_html[:100] + '...' if body_html else ''),
                        'body_text': body_text,
                        'body_html': body_html,
                        'message_id': message_id,
                        'references': references,
                        'in_reply_to': in_reply_to
                    })
                except Exception as e:
                    print(f"Error parsing POP3 email {i}: {e}")
                    continue
            
            return email_list

        finally:
            pop.quit()

    def _fetch_emails_imap(self, folder="INBOX", page=1, limit=20):
        mail = self._get_imap_connection()
        try:
            # Select folder
            status, messages = mail.select(f'"{folder}"') 
            if status != 'OK':
                 mail.select(folder)
            
            # Search
            status, data = mail.search(None, 'ALL')
            if status != 'OK':
                return []
                
            mail_ids = data[0].split()
            total_emails = len(mail_ids)
            
            # Calculate slice indices
            # Python slicing is [start:end], negative indices count from end
            # Page 1 (limit 20): [-20:]
            # Page 2 (limit 20): [-40:-20]
            
            end_idx = total_emails - (page - 1) * limit
            start_idx = max(0, end_idx - limit)
            
            if end_idx <= 0:
                return []
                
            # Grab the slice. 
            # If we used negative indexing logic:
            # start_from_end = (page - 1) * limit
            # latest_ids = mail_ids[-(start_from_end + limit) : -start_from_end if start_from_end > 0 else None]
            
            latest_ids = mail_ids[start_idx:end_idx]
            
            email_list = []
            
            for num in reversed(latest_ids):
                try:
                    _, msg_data = mail.fetch(num, '(RFC822)')
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    
                    subject = msg['subject']
                    sender = msg['from']
                    date = msg['date']
                    
                    body_text = ""
                    body_html = ""
                    
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            if "attachment" not in content_disposition:
                                if content_type == "text/plain" and not body_text:
                                    body_text = part.get_payload(decode=True).decode(errors='ignore')
                                elif content_type == "text/html" and not body_html:
                                    body_html = part.get_payload(decode=True).decode(errors='ignore')
                    else:
                        content_type = msg.get_content_type()
                        payload = msg.get_payload(decode=True).decode(errors='ignore')
                        if content_type == "text/html":
                            body_html = payload
                        else:
                            body_text = payload
                    
                    # Threading headers
                    message_id = msg.get('Message-ID', '')
                    references = msg.get('References', '')
                    in_reply_to = msg.get('In-Reply-To', '')
                    
                    email_list.append({
                        'id': int(num),
                        'subject': str(subject),
                        'from': str(sender),
                        'date': str(date),
                        'snippet': (body_text[:100] + '...') if body_text else (body_html[:100] + '...' if body_html else ''),
                        'body_text': body_text,
                        'body_html': body_html,
                        'message_id': message_id,
                        'references': references,
                        'in_reply_to': in_reply_to
                    })
                except Exception as e:
                    print(f"Error parsing IMAP email {num}: {e}")
                    continue
                    
            return email_list
        finally:
            try:
                mail.logout()
            except:
                pass
            
    # ... (_get_smtp_connection and send_email remain same)
    
    def send_email(self, to_email, subject, body_html):
        """Sends an email."""
        msg = MIMEMultipart()
        msg['From'] = self.integration.email_address if self.integration.provider != EmailProvider.CUSTOM else self.integration.username
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html'))
        
        server = self._get_smtp_connection()
        try:
            server.send_message(msg)
            return True
        finally:
            server.quit()

