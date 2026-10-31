const serverStatusPage = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />

      <meta
        name="description"
        content="Server status page"
      />

      <meta
        name="theme-color"
        content="#070b12"
      />
    
      <title>Server Status</title>

      <style>
        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          min-height: 100%;
          margin: 0;
        }

        body {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 24px;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          color: #e5e7eb;

          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(37, 99, 235, 0.14),
              transparent 32%
            ),
            #070b12;

          overflow: hidden;
        }

        /* Background grid */
        body::before {
          content: "";

          position: fixed;
          inset: 0;

          pointer-events: none;

          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            );

          background-size: 32px 32px;

          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 85%
          );
        }

        .page {
          width: 100%;
          max-width: 520px;

          position: relative;
          z-index: 1;
        }

        .status-card {
          position: relative;
          overflow: hidden;

          padding: 48px 40px 36px;

          text-align: center;

          background: rgba(15, 23, 42, 0.82);

          border: 1px solid rgba(148, 163, 184, 0.14);

          border-radius: 24px;

          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        /* Top highlight */
        .status-card::before {
          content: "";

          position: absolute;

          top: 0;
          left: 12%;
          right: 12%;

          height: 1px;

          background: linear-gradient(
            90deg,
            transparent,
            rgba(59, 130, 246, 0.7),
            transparent
          );
        }

        /* Server icon */
        .server-icon {
          width: 76px;
          height: 76px;

          margin: 0 auto 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 20px;

          background: rgba(34, 197, 94, 0.08);

          border: 1px solid rgba(34, 197, 94, 0.18);

          box-shadow:
            0 0 40px rgba(34, 197, 94, 0.08);
        }

        .server-icon svg {
          width: 38px;
          height: 38px;
        }

        /* Status badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          margin-bottom: 18px;
          padding: 7px 12px;

          border-radius: 999px;

          color: #86efac;

          background: rgba(34, 197, 94, 0.08);

          border: 1px solid rgba(34, 197, 94, 0.16);

          font-size: 12px;
          font-weight: 600;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .status-dot {
          width: 7px;
          height: 7px;

          flex-shrink: 0;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.1),
            0 0 14px rgba(34, 197, 94, 0.5);
        }

        /* Main heading */
        h1 {
          margin: 0;

          color: #f8fafc;

          font-size: clamp(28px, 5vw, 36px);

          line-height: 1.15;

          font-weight: 700;

          letter-spacing: -0.03em;
        }

        /* Description */
        .description {
          max-width: 380px;

          margin: 14px auto 0;

          color: #94a3b8;

          font-size: 15px;

          line-height: 1.7;
        }

        /* Divider */
        .divider {
          width: 100%;
          height: 1px;

          margin: 32px 0 24px;

          background: rgba(148, 163, 184, 0.1);
        }

        /* Server information */
        .server-info {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 14px 16px;

          border-radius: 12px;

          background: rgba(255, 255, 255, 0.025);

          border: 1px solid rgba(148, 163, 184, 0.08);

          text-align: left;
        }

        .info-label {
          color: #64748b;

          font-size: 12px;
          font-weight: 500;

          letter-spacing: 0.06em;

          text-transform: uppercase;
        }

        .info-value {
          color: #cbd5e1;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size: 12px;
          font-weight: 500;
        }

        /* Footer */
        .footer {
          margin-top: 28px;

          color: #475569;

          font-size: 11px;

          letter-spacing: 0.04em;
        }

        /* Mobile */
        @media (max-width: 480px) {
          body {
            padding: 16px;
          }

          .status-card {
            padding: 36px 24px 30px;

            border-radius: 20px;
          }

          .server-icon {
            width: 68px;
            height: 68px;

            margin-bottom: 24px;
          }

          .server-icon svg {
            width: 34px;
            height: 34px;
          }

          h1 {
            font-size: 28px;
          }

          .description {
            font-size: 14px;
          }
        }
      </style>
    </head>

    <body>
      <main class="page">
        <section
          class="status-card"
          aria-label="Server status"
        >
          <!-- Server Icon -->
          <div class="server-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 6.5C4 5.672 4.672 5 5.5 5H18.5C19.328 5 20 5.672 20 6.5V9.5C20 10.328 19.328 11 18.5 11H5.5C4.672 11 4 10.328 4 9.5V6.5Z"
                stroke="#22c55e"
                stroke-width="1.5"
              />

              <path
                d="M4 14.5C4 13.672 4.672 13 5.5 13H18.5C19.328 13 20 13.672 20 14.5V17.5C20 18.328 19.328 19 18.5 19H5.5C4.672 19 4 18.328 4 17.5V14.5Z"
                stroke="#22c55e"
                stroke-width="1.5"
              />

              <circle
                cx="7"
                cy="8"
                r="1"
                fill="#60a5fa"
              />

              <circle
                cx="7"
                cy="16"
                r="1"
                fill="#60a5fa"
              />

              <path
                d="M10 8H17"
                stroke="#64748b"
                stroke-width="1.5"
                stroke-linecap="round"
              />

              <path
                d="M10 16H17"
                stroke="#64748b"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <!-- Status -->
          <div
            class="status-badge"
            role="status"
            aria-label="Server operational"
          >
            <span class="status-dot"></span>
            Operational
          </div>

          <!-- Heading -->
          <h1>
            Server is up and running
          </h1>

          <!-- Description -->
          <p class="description">
            The backend service is online and ready
            to receive requests.
          </p>

          <!-- Divider -->
          <div class="divider"></div>

          <!-- Server Status -->
          <div class="server-info">
            <span class="info-label">
              System Status
            </span>

            <span class="info-value">
              ONLINE
            </span>
          </div>

          <!-- Footer -->
          <footer class="footer">
            Backend Service
            &nbsp;•&nbsp;
            All systems operational
          </footer>
        </section>
      </main>
    </body>
  </html>
`;

module.exports = serverStatusPage;
