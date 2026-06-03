const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEnergyAlert(userEmail, alertData) {
    try {
      const { type, title, message, severity, consumption, cost } = alertData;
      
      const emailTemplate = this.getEnergyAlertTemplate(type, title, message, severity, consumption, cost);
      
      const mailOptions = {
        from: `"Smart City Energy" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `🚨 Energy Alert: ${title}`,
        html: emailTemplate
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Energy alert email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  async sendSolarRecommendation(userEmail, solarData) {
    try {
      const { location, suitabilityScore, annualSavings, paybackPeriod, installationCost } = solarData;
      
      const emailTemplate = this.getSolarRecommendationTemplate(location, suitabilityScore, annualSavings, paybackPeriod, installationCost);
      
      const mailOptions = {
        from: `"Smart City Energy" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `☀️ Solar Panel Recommendation for ${location.city}`,
        html: emailTemplate
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Solar recommendation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Solar email sending error:', error);
      throw error;
    }
  }

  getEnergyAlertTemplate(type, title, message, severity, consumption, cost) {
    const severityColors = {
      low: '#10B981',
      medium: '#F59E0B', 
      high: '#EF4444',
      critical: '#DC2626'
    };

    const severityEmojis = {
      low: '💡',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Smart City Energy Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🏙️ Smart City Energy</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Energy Optimization Alert</p>
          </div>
          
          <!-- Alert Content -->
          <div style="background: white; padding: 30px 20px;">
            <div style="background: ${severityColors[severity]}; color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">${severityEmojis[severity]} ${severity.toUpperCase()} PRIORITY ALERT</h2>
            </div>
            
            <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 22px;">${title}</h3>
            <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">${message}</p>
            
            <!-- Energy Data -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #374151;">📊 Current Energy Data</h4>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold;">Consumption:</span>
                <span style="color: #059669;">${consumption || 'N/A'} kWh</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold;">Current Cost:</span>
                <span style="color: #DC2626;">₹${cost || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: bold;">Alert Time:</span>
                <span>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            </div>
            
            <!-- Recommendations -->
            <div style="background: #ecfdf5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #065f46;">💡 Immediate Actions</h4>
              <ul style="margin: 0; padding-left: 20px; color: #047857;">
                <li>Check high-consumption appliances (AC, water heater, refrigerator)</li>
                <li>Switch off unnecessary lights and electronics</li>
                <li>Avoid using heavy appliances during peak hours (6-10 PM)</li>
                <li>Consider switching to energy-efficient LED bulbs</li>
              </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                 style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Smart City Energy Optimization System<br>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings" style="color: #10B981; text-decoration: none;">Manage Alert Preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getSolarRecommendationTemplate(location, suitabilityScore, annualSavings, paybackPeriod, installationCost) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Solar Panel Recommendation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">☀️ Solar Panel Recommendation</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Personalized for ${location.city}, India</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 30px 20px;">
            <!-- Suitability Score -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: ${suitabilityScore >= 80 ? '#10B981' : suitabilityScore >= 60 ? '#F59E0B' : '#EF4444'}; color: white; width: 120px; height: 120px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 15px;">
                ${suitabilityScore}/100
              </div>
              <h3 style="margin: 0; color: #1f2937;">Solar Suitability Score</h3>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Based on your location: ${location.address}</p>
            </div>
            
            <!-- Financial Benefits -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #166534;">💰 Financial Benefits</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Annual Savings:</strong><br>
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">₹${annualSavings?.toLocaleString('en-IN') || 'N/A'}</span>
                </div>
                <div>
                  <strong>Payback Period:</strong><br>
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">${paybackPeriod || 'N/A'} years</span>
                </div>
                <div>
                  <strong>Installation Cost:</strong><br>
                  <span style="color: #DC2626; font-size: 18px; font-weight: bold;">₹${installationCost?.toLocaleString('en-IN') || 'N/A'}</span>
                </div>
                <div>
                  <strong>25-Year Savings:</strong><br>
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">₹${((annualSavings || 0) * 25).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            
            <!-- Government Subsidies -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #1e40af;">🏛️ Government Subsidies Available</h4>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                <li><strong>Central Subsidy:</strong> 40% for up to 3kW, 20% for 3-10kW</li>
                <li><strong>State Subsidy:</strong> Additional 10-30% (varies by state)</li>
                <li><strong>Net Metering:</strong> Sell excess power back to grid</li>
                <li><strong>Tax Benefits:</strong> Depreciation benefits under Income Tax</li>
              </ul>
            </div>
            
            <!-- Next Steps -->
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #92400e;">📋 Next Steps</h4>
              <ol style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Get professional site assessment</li>
                <li>Apply for government subsidy online</li>
                <li>Choose certified solar installer</li>
                <li>Complete installation and net metering setup</li>
              </ol>
            </div>
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/renewable" 
                 style="background: #F59E0B; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 0 10px;">
                View Detailed Analysis
              </a>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat" 
                 style="background: #10B981; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 0 10px;">
                Ask AI Assistant
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Smart City Energy Optimization System<br>
              Helping India transition to renewable energy 🇮🇳
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
