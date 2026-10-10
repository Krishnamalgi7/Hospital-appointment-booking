import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

def send_doctor_credentials(email: str, name: str, password: str, hospital_name: str) -> bool:
    """
    Sends an email with auto-generated credentials to the newly created doctor.
    Reads SMTP credentials from environment variables.
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP_USERNAME or SMTP_PASSWORD not set. Skipping credential email for %s.", email)
        return False

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = email
    msg['Subject'] = "Welcome to Hospitum Core - Your Account Credentials"

    body = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Inter', Arial, sans-serif;
                color: #334155;
                background-color: #f8fafc;
                padding: 20px;
            }}
            .container {{
                background-color: #ffffff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                margin: 0 auto;
                border-top: 4px solid #06b6d4;
            }}
            h2 {{
                color: #0f172a;
                margin-top: 0;
            }}
            .credentials {{
                background: #f1f5f9;
                padding: 20px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 15px;
                margin: 20px 0;
                border-left: 4px solid #3b82f6;
            }}
            .btn {{
                display: inline-block;
                padding: 12px 24px;
                background-color: #06b6d4;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin-top: 10px;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 13px;
                color: #64748b;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome to Hospitum Core</h2>
            <p>Hello Dr. {name},</p>
            <p>An administrator has successfully created a doctor account for you at <strong>{hospital_name}</strong>.</p>
            <p>Here are your securely generated login credentials:</p>
            
            <div class="credentials">
                <strong>Login Email:</strong> {email}<br>
                <strong>Password:</strong> {password}
            </div>
            
            <p>For your security, we strongly recommend changing your password immediately after your first login.</p>
            
            <p>
                <a href="http://localhost:5500" class="btn" style="color: white;">Login to Hospitum Core</a>
            </p>
            
            <div class="footer">
                This is an automated message from the Hospitum Core system. Please do not reply to this email.
            </div>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logger.info("Successfully sent credential email to %s", email)
        return True
    except Exception as e:
        logger.error("Failed to send credential email to %s: %s", email, str(e))
        return False
