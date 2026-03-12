export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

export default function LabelPrintingDocPage() {
  return (
    <AppLayout title="Label printing (no dialog)">
      <div className="container py-4">
        <div className="card">
          <div className="card-body">
            <h1 className="h4 mb-3">One-Click Label Printing (No Dialog)</h1>
            <p className="mb-4">
              To print labels directly to your Xprinter XP-T202UA without the system print dialog,
              use Chrome with <strong>kiosk-printing</strong> and set the label printer as the default printer.
            </p>

            <h2 className="h5 mt-4 mb-2">1. Set the default printer (Windows)</h2>
            <ol>
              <li>Open <strong>Settings</strong> → <strong>Bluetooth & devices</strong> → <strong>Printers & scanners</strong> (or <strong>Devices and Printers</strong> in Control Panel).</li>
              <li>Find <strong>Xprinter XP-T202UA</strong> and right-click it.</li>
              <li>Select <strong>Set as default printer</strong>.</li>
            </ol>
            <p className="text-muted small">Labels will print to the default printer when using kiosk-printing.</p>

            <h2 className="h5 mt-4 mb-2">2. Run Chrome with kiosk-printing</h2>
            <p>Chrome must be started with the <code>--kiosk-printing</code> flag so that print jobs go straight to the default printer with no dialog.</p>

            <h3 className="h6 mt-3 mb-2">Option A: Shortcut</h3>
            <ol>
              <li>Right-click the desktop → <strong>New</strong> → <strong>Shortcut</strong>.</li>
              <li><strong>Target</strong> (use your actual Chrome path), for example:<br />
                <code className="d-inline-block mt-1 p-2 bg-light rounded small">"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing</code><br />
                Or if Chrome is in Program Files (x86):<br />
                <code className="d-inline-block mt-1 p-2 bg-light rounded small">"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing</code>
              </li>
              <li>Name the shortcut (e.g. &quot;Chrome POS&quot;).</li>
              <li>Use this shortcut whenever you open the POS. All print actions from this window will go to the default printer without showing the dialog.</li>
            </ol>

            <h3 className="h6 mt-3 mb-2">Option B: Command line</h3>
            <p>From Command Prompt or PowerShell:</p>
            <pre className="p-2 bg-light rounded small">"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing</pre>
            <p>Then open your POS URL in that Chrome window.</p>

            <h2 className="h5 mt-4 mb-2">3. Use the POS</h2>
            <ol>
              <li>Open the POS in the Chrome window you started with <code>--kiosk-printing</code>.</li>
              <li>Go to <strong>Print Labels</strong>, select products and options, then click <strong>Print X Labels</strong>.</li>
              <li>The labels are sent to the Xprinter with no print dialog.</li>
            </ol>

            <h2 className="h5 mt-4 mb-2">Alternative: Windows label print service</h2>
            <p>You can avoid the print dialog without Chrome kiosk-printing by running the <strong>label print service</strong> on the PC connected to the Xprinter. The service polls the POS API for label jobs and prints them directly.</p>
            <ol>
              <li>Set up a <strong>Print API token</strong> in Settings (same as for the Android receipt printer if you use one).</li>
              <li>On the PC with the Xprinter, run the service from the repo: see <code>services/label-print-service/README.md</code> for config (API_BASE_URL, PRINT_API_TOKEN) and how to run once or as a Windows service (e.g. NSSM).</li>
              <li>Set the Xprinter as default printer (or set PRINTER_NAME when running the service).</li>
              <li>In Print Labels, click <strong>Print via service</strong>; the service picks up the job and prints with no dialog. Works from any browser.</li>
            </ol>

            <h2 className="h5 mt-4 mb-2">Notes</h2>
            <ul>
              <li>Only that Chrome window (and any windows opened from it) use kiosk-printing. Other Chrome windows behave normally.</li>
              <li>If you open the POS in a normal Chrome window, the usual print dialog will still appear.</li>
              <li>This applies to Chrome and Chromium-based browsers.</li>
            </ul>

            <p className="mt-4 mb-0">
              <Link href="/label" className="btn btn-primary btn-sm">Back to Print Labels</Link>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
