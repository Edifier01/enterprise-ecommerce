"""Transactional email copy and HTML layout for customer auth."""

from html import escape


def _layout(*, title: str, body_html: str) -> str:
    safe_title = escape(title)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px 28px;">
          <tr>
            <td style="padding-bottom:20px;font-size:20px;font-weight:700;color:#334155;">Сухопут</td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:#3f3f46;">{body_html}</td>
          </tr>
          <tr>
            <td style="padding-top:28px;font-size:12px;line-height:1.5;color:#71717a;">
              Это автоматическое письмо. Если вы не запрашивали это действие, просто проигнорируйте сообщение.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_verification_email(
    *,
    verify_url: str,
    verification_code: str,
) -> tuple[str, str, str]:
    subject = "Подтвердите email — Сухопут"
    body_text = (
        "Здравствуйте!\n\n"
        "Для завершения регистрации введите код подтверждения на сайте:\n"
        f"Код: {verification_code}\n\n"
        "Или перейдите по ссылке:\n"
        f"{verify_url}\n\n"
        "Код и ссылка действуют ограниченное время. "
        "Если вы не регистрировались, проигнорируйте это письмо."
    )
    safe_url = escape(verify_url)
    safe_code = escape(verification_code)
    body_html = _layout(
        title=subject,
        body_html=(
            "<p>Здравствуйте!</p>"
            "<p>Для завершения регистрации введите код на сайте:</p>"
            f'<p style="font-size:28px;font-weight:700;letter-spacing:0.2em;color:#334155;margin:16px 0;">{safe_code}</p>'
            "<p>Или нажмите кнопку ниже:</p>"
            f'<p><a href="{safe_url}" style="display:inline-block;background:#334155;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">Подтвердить email</a></p>'
            f'<p style="word-break:break-all;font-size:13px;color:#71717a;">{safe_url}</p>'
            "<p>Код и ссылка действуют ограниченное время. "
            "Если вы не регистрировались, проигнорируйте это письмо.</p>"
        ),
    )
    return subject, body_text, body_html


def build_password_reset_email(*, reset_url: str) -> tuple[str, str, str]:
    subject = "Восстановление пароля — Сухопут"
    body_text = (
        "Здравствуйте!\n\n"
        "Для сброса пароля перейдите по ссылке:\n"
        f"{reset_url}\n\n"
        "Ссылка действует ограниченное время. "
        "Если вы не запрашивали сброс, проигнорируйте это письмо."
    )
    safe_url = escape(reset_url)
    body_html = _layout(
        title=subject,
        body_html=(
            "<p>Здравствуйте!</p>"
            "<p>Вы запросили восстановление пароля. Перейдите по ссылке ниже:</p>"
            f'<p><a href="{safe_url}" style="display:inline-block;background:#334155;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">Сбросить пароль</a></p>'
            f'<p style="word-break:break-all;font-size:13px;color:#71717a;">{safe_url}</p>'
            "<p>Ссылка действует ограниченное время. "
            "Если вы не запрашивали сброс, проигнорируйте это письмо.</p>"
        ),
    )
    return subject, body_text, body_html
