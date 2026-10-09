const passwordResetOtpTemplate = ({ name, otp }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f5f7fa;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="background-color: #f5f7fa; padding: 40px 20px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  max-width: 600px;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                "
              >

                <!-- Header -->
                <tr>
                  <td
                    style="
                      background-color: #2192d0;
                      padding: 24px;
                      text-align: center;
                    "
                  >
                    <h1
                      style="
                        margin: 0;
                        color: #ffffff;
                        font-size: 24px;
                      "
                    >
                      Password Reset
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">

                    <p
                      style="
                        margin: 0 0 16px;
                        color: #222222;
                        font-size: 16px;
                        line-height: 1.6;
                      "
                    >
                      Hello ${name || "User"},
                    </p>

                    <p
                      style="
                        margin: 0 0 24px;
                        color: #555555;
                        font-size: 15px;
                        line-height: 1.6;
                      "
                    >
                      We received a request to reset your password.
                      Please use the verification code below to continue.
                    </p>

                    <!-- OTP -->
                    <div
                      style="
                        margin: 30px 0;
                        padding: 20px;
                        background-color: #f5f9fc;
                        border: 1px solid #dcecf5;
                        border-radius: 10px;
                        text-align: center;
                      "
                    >
                      <p
                        style="
                          margin: 0 0 10px;
                          color: #777777;
                          font-size: 13px;
                        "
                      >
                        Your verification code
                      </p>

                      <div
                        style="
                          color: #2192d0;
                          font-size: 32px;
                          font-weight: 700;
                          letter-spacing: 8px;
                        "
                      >
                        ${otp}
                      </div>
                    </div>

                    <p
                      style="
                        margin: 0 0 12px;
                        color: #555555;
                        font-size: 14px;
                        line-height: 1.6;
                      "
                    >
                      This OTP will expire in
                      <strong>10 minutes</strong>.
                    </p>

                    <p
                      style="
                        margin: 0;
                        color: #777777;
                        font-size: 13px;
                        line-height: 1.6;
                      "
                    >
                      If you did not request a password reset,
                      you can safely ignore this email.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td
                    style="
                      padding: 20px 32px;
                      background-color: #fafafa;
                      text-align: center;
                    "
                  >
                    <p
                      style="
                        margin: 0;
                        color: #999999;
                        font-size: 12px;
                      "
                    >
                      This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

module.exports = {
  passwordResetOtpTemplate,
};
