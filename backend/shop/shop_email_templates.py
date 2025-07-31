# shop_email_templates.py
def get_shop_registration_template(otp, shop_name, owner_name):
    """Template for shop registration OTP email"""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shop Registration - Verify Your Business</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 0;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .shop-icon {{
                font-size: 48px;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 40px 30px;
                text-align: center;
            }}
            .welcome-text {{
                font-size: 18px;
                color: #555;
                margin-bottom: 30px;
            }}
            .shop-info {{
                background-color: #ecf0f1;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }}
            .shop-info h3 {{
                margin: 0 0 10px 0;
                color: #2c3e50;
            }}
            .otp-container {{
                background-color: #f8f9fa;
                border: 2px dashed #3498db;
                border-radius: 10px;
                padding: 30px;
                margin: 30px 0;
            }}
            .otp-label {{
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .otp-code {{
                font-size: 36px;
                font-weight: bold;
                color: #3498db;
                letter-spacing: 8px;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }}
            .expiry-text {{
                color: #e74c3c;
                font-size: 14px;
                margin-top: 15px;
            }}
            .business-benefits {{
                background-color: #e8f6f3;
                border-left: 4px solid #1abc9c;
                padding: 20px;
                margin: 30px 0;
                border-radius: 5px;
                text-align: left;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #eee;
            }}
            @media only screen and (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .header, .content, .footer {{
                    padding: 20px;
                }}
                .otp-code {{
                    font-size: 28px;
                    letter-spacing: 4px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="shop-icon">🏪</div>
                <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
                <p class="welcome-text">
                    Hello {owner_name},<br>
                    Thank you for registering your business with us! We're excited to have you join our community of successful merchants.
                </p>
                
                <div class="shop-info">
                    <h3>🏪 Business Information</h3>
                    <p><strong>Shop Name:</strong> {shop_name}</p>
                    <p><strong>Owner:</strong> {owner_name}</p>
                </div>
                
                <div class="otp-container">
                    <div class="otp-label">Business Verification Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="expiry-text">⏰ This code expires in 10 minutes</div>
                </div>
                
                <div class="business-benefits">
                    <strong>🚀 What's Next?</strong>
                    <ul>
                        <li>Complete your business verification</li>
                        <li>Set up your shop profile</li>
                        <li>Start reaching more customers</li>
                        <li>Access powerful business tools</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>Ready to grow your business? We're here to help!</p>
                <p>&copy; 2025 Your Platform Name. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_shop_forgot_password_template(otp, shop_name, owner_name):
    """Template for shop forgot password OTP email"""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Secure Your Business Account</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 0;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .security-icon {{
                font-size: 48px;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 40px 30px;
                text-align: center;
            }}
            .alert-text {{
                font-size: 18px;
                color: #555;
                margin-bottom: 30px;
            }}
            .business-info {{
                background-color: #fdf2e9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
                border-left: 4px solid #e67e22;
            }}
            .otp-container {{
                background-color: #f8f9fa;
                border: 2px dashed #e74c3c;
                border-radius: 10px;
                padding: 30px;
                margin: 30px 0;
            }}
            .otp-label {{
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .otp-code {{
                font-size: 36px;
                font-weight: bold;
                color: #e74c3c;
                letter-spacing: 8px;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }}
            .expiry-text {{
                color: #e74c3c;
                font-size: 14px;
                margin-top: 15px;
            }}
            .security-warning {{
                background-color: #fdedec;
                border: 1px solid #f1948a;
                border-radius: 5px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #eee;
            }}
            @media only screen and (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .header, .content, .footer {{
                    padding: 20px;
                }}
                .otp-code {{
                    font-size: 28px;
                    letter-spacing: 4px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="security-icon">🔐</div>
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p class="alert-text">
                    Hello {owner_name},<br>
                    We received a request to reset the password for your business account.
                </p>
                
                <div class="business-info">
                    <strong>🏪 Account Details:</strong><br>
                    Business: {shop_name}<br>
                    Owner: {owner_name}
                </div>
                
                <div class="otp-container">
                    <div class="otp-label">Password Reset Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="expiry-text">⏰ This code expires in 10 minutes</div>
                </div>
                
                <div class="security-warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>If you didn't request this password reset, please ignore this email</li>
                        <li>Never share this code with anyone - our team will never ask for it</li>
                        <li>This code can only be used once</li>
                        <li>For security concerns, contact support immediately</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>Keep your business account secure. Contact support if you have concerns.</p>
                <p>&copy; 2025 Your Platform Name. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_shop_resend_otp_template(otp, shop_name, owner_name):
    """Template for shop resend OTP email"""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Verification Code - Complete Your Registration</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 0;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .refresh-icon {{
                font-size: 48px;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 40px 30px;
                text-align: center;
            }}
            .message-text {{
                font-size: 18px;
                color: #555;
                margin-bottom: 30px;
            }}
            .business-info {{
                background-color: #eafaf1;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
                border-left: 4px solid #27ae60;
            }}
            .otp-container {{
                background-color: #f8f9fa;
                border: 2px dashed #27ae60;
                border-radius: 10px;
                padding: 30px;
                margin: 30px 0;
            }}
            .otp-label {{
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .otp-code {{
                font-size: 36px;
                font-weight: bold;
                color: #27ae60;
                letter-spacing: 8px;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }}
            .expiry-text {{
                color: #e74c3c;
                font-size: 14px;
                margin-top: 15px;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #eee;
            }}
            @media only screen and (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .header, .content, .footer {{
                    padding: 20px;
                }}
                .otp-code {{
                    font-size: 28px;
                    letter-spacing: 4px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="refresh-icon">🔄</div>
                <h1>New Verification Code</h1>
            </div>
            <div class="content">
                <p class="message-text">
                    Hello {owner_name},<br>
                    Here's your new verification code as requested.
                </p>
                
                <div class="business-info">
                    <strong>🏪 Business Account:</strong><br>
                    Shop: {shop_name}<br>
                    Owner: {owner_name}
                </div>
                
                <div class="otp-container">
                    <div class="otp-label">New Verification Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="expiry-text">⏰ This code expires in 10 minutes</div>
                </div>
            </div>
            <div class="footer">
                <p>Previous verification codes are now invalid. Use only the code above.</p>
                <p>&copy; 2025 Your Platform Name. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """