import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Medication, DoseLog } from '@/stores/medicationStore';
import { VitalReading } from '@/stores/vitalsStore';

export interface ReportData {
  seniorName: string;
  caregiverName: string;
  medications: Medication[];
  doseLogs: DoseLog[];
  vitals: VitalReading[];
}

export const generateDoctorReport = async (data: ReportData) => {
  const { seniorName, caregiverName, medications, doseLogs, vitals } = data;
  const today = new Date().toLocaleDateString();

  // Calculate adherence
  const adherence = doseLogs.length > 0 
    ? Math.round((doseLogs.filter(l => l.status === 'taken').length / doseLogs.length) * 100) 
    : 100;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 40px; }
          .header { border-bottom: 2px solid #22C55E; padding-bottom: 20px; margin-bottom: 30px; }
          .title { color: #22C55E; font-size: 28px; margin: 0; }
          .subtitle { font-size: 14px; color: #64748B; margin-top: 5px; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .card { background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; }
          .card-title { font-weight: bold; font-size: 12px; color: #64748B; text-transform: uppercase; margin-bottom: 5px; }
          .card-value { font-size: 20px; font-weight: bold; color: #0F172A; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #F1F5F9; padding: 12px; font-size: 12px; color: #475569; border-bottom: 1px solid #CBD5E1; }
          td { padding: 12px; font-size: 14px; border-bottom: 1px solid #E2E8F0; }
          
          .status-taken { color: #16A34A; font-weight: bold; }
          .status-missed { color: #DC2626; font-weight: bold; }
          
          .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; border-left: 4px solid #22C55E; padding-left: 10px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">SeniorCare Hub: Clinical Report</h1>
          <p class="subtitle">Generated on ${today} | Prepared for medical evaluation</p>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">Patient Name</div>
            <div class="card-value">${seniorName}</div>
          </div>
          <div class="card">
            <div class="card-title">Authorized Caregiver</div>
            <div class="card-value">${caregiverName}</div>
          </div>
          <div class="card">
            <div class="card-title">30-Day Medication Adherence</div>
            <div class="card-value">${adherence}%</div>
          </div>
          <div class="card">
            <div class="card-title">Active Medications</div>
            <div class="card-value">${medications.length}</div>
          </div>
        </div>

        <div class="section-title">Current Medications</div>
        <table>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${medications.map(m => `
              <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.dosage}</td>
                <td>${m.frequency}</td>
                <td>${m.pills_remaining !== undefined ? `${m.pills_remaining} pills left` : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Recent Vitals Summary</div>
        <table>
          <thead>
            <tr>
              <th>Vital</th>
              <th>Latest Reading</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${['bp', 'hr', 'temp'].map(type => {
              const latest = vitals.filter(v => v.type === type)[0];
              return latest ? `
                <tr>
                  <td>${type === 'bp' ? 'Blood Pressure' : type === 'hr' ? 'Heart Rate' : 'Temperature'}</td>
                  <td><strong>${latest.value}</strong></td>
                  <td>${new Date(latest.measured_at).toLocaleDateString()}</td>
                  <td style="color: ${latest.status === 'normal' ? '#16A34A' : '#DC2626'}">${latest.status.toUpperCase()}</td>
                </tr>
              ` : '';
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          This report was generated securely by SeniorCare Hub. 
          The data provided is for informational purposes only and should be reviewed by a qualified healthcare professional.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Report Generation Error:', error);
    throw error;
  }
};
