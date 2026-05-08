export function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      background: "var(--bg-surface)",
      padding: "24px 16px",
      marginTop: 40,
      fontSize: "0.75rem",
      color: "var(--text-muted)",
      lineHeight: 1.8,
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: "var(--text)", fontSize: "0.8rem" }}>AI Fraud Lab</strong>
            <p style={{ margin: "4px 0" }}>
              An open-source demonstration of agentic coding (vibe coding) for building custom fraud
              scenario labs. Built with Azure Functions, ML.NET, Microsoft Foundry, and React.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: "var(--text)", fontSize: "0.8rem" }}>Links</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
              <a href="https://github.com/michaelsrichter/fraud-ai-demo" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
              <a href="https://www.linkedin.com/in/mikerichter/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: "var(--text)", fontSize: "0.8rem" }}>Legal</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
              <a href="#terms" onClick={(e) => { e.preventDefault(); document.getElementById("terms")?.scrollIntoView({ behavior: "smooth" }); }}>Terms of Use</a>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); document.getElementById("privacy")?.scrollIntoView({ behavior: "smooth" }); }}>Privacy Policy</a>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <details id="terms" style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text)" }}>Terms of Use</summary>
            <div style={{ padding: "8px 0" }}>
              <p>
                This application ("AI Fraud Lab") is provided on an "AS IS" and "AS AVAILABLE" basis,
                without warranties of any kind, either express or implied. This is a demonstration
                project intended solely for educational and illustrative purposes — specifically to
                showcase how agentic coding techniques can be used to build custom fraud detection
                scenario labs.
              </p>
              <p>
                ALL DATA DISPLAYED IN THIS APPLICATION IS ENTIRELY SYNTHETIC AND FICTITIOUS. No real
                individuals, companies, transactions, or financial records are represented. Any
                resemblance to actual persons, businesses, or events is purely coincidental.
              </p>
              <p>
                The authors, contributors, and maintainers of this project disclaim all liability for
                any damages, losses, or consequences arising from the use, misuse, or inability to use
                this application or any information it provides. This includes but is not limited to
                direct, indirect, incidental, special, consequential, or punitive damages.
              </p>
              <p>
                No representation or warranty is made regarding the accuracy, reliability, completeness,
                or timeliness of any AI-generated analysis, ML model outputs, fraud detection scores,
                or any other content. The AI and ML outputs are for demonstration purposes only and must
                not be relied upon for actual fraud detection, investigation, or any business decision.
              </p>
              <p>
                By using this application, you agree that you do so at your own risk and that you will
                not hold the authors or contributors liable for any outcome resulting from such use.
              </p>
            </div>
          </details>

          <details id="privacy" style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text)" }}>Privacy Policy</summary>
            <div style={{ padding: "8px 0" }}>
              <p>
                This application stores a minimal user profile (name, role, company, location) in your
                browser's local storage solely to personalize your demo experience. This data is not
                shared with third parties, is not used for tracking or advertising, and can be cleared
                at any time by clearing your browser's local storage.
              </p>
              <p>
                When deployed to Azure, standard Azure infrastructure telemetry (Application Insights)
                may collect anonymized usage metrics for operational monitoring. No personally
                identifiable information is intentionally collected or stored on the server beyond the
                optional profile you create.
              </p>
              <p>
                This application does not use cookies for tracking. No data is sold, rented, or
                otherwise distributed to any third party.
              </p>
            </div>
          </details>

          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text)" }}>Disclaimer</summary>
            <div style={{ padding: "8px 0" }}>
              <p>
                This project is an independent demonstration and is not affiliated with, endorsed by, or
                representative of any employer, organization, or entity. The views and approaches
                demonstrated here are the author's own.
              </p>
              <p>
                The fraud detection techniques shown are simplified for demonstration purposes and do not
                represent production-grade fraud detection systems. Real-world fraud detection requires
                significantly more sophisticated approaches, regulatory compliance, and domain expertise.
              </p>
              <p>
                AI model outputs are non-deterministic and may vary between runs. No guarantee is made
                about the consistency, accuracy, or reliability of any AI-generated content.
              </p>
            </div>
          </details>
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} AI Fraud Lab — Open Source Demo · All data is synthetic · No warranties expressed or implied
        </p>
      </div>
    </footer>
  );
}
