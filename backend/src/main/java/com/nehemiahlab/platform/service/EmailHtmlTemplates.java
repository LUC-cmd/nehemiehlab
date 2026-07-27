package com.nehemiahlab.platform.service;

/**
 * Modèles HTML + texte pour une meilleure délivrabilité (moins de spam).
 */
final class EmailHtmlTemplates {

    private static final String BRAND_COLOR = "#004b57";
    private static final String FOOTER = "Smart Kids Academy — Nehemiah Lab · Lomé, Togo";

    private EmailHtmlTemplates() {
    }

    static String wrapHtml(String title, String innerHtml) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f4f7f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f7f8;padding:24px 12px;">
                    <tr><td align="center">
                      <table role="presentation" width="100%%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                        <tr><td style="background:%s;padding:20px 24px;">
                          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Smart Kids Academy</p>
                          <p style="margin:6px 0 0;color:#b8e0e6;font-size:13px;">%s</p>
                        </td></tr>
                        <tr><td style="padding:24px;color:#334155;font-size:15px;line-height:1.6;">%s</td></tr>
                        <tr><td style="padding:16px 24px 22px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">%s</td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(BRAND_COLOR, escape(title), innerHtml, escape(FOOTER));
    }

    static String otpHtml(String prenom, String code) {
        return """
                <p style="margin:0 0 12px;">Bonjour <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Voici votre code de vérification pour réinitialiser votre mot de passe :</p>
                <p style="margin:0 0 20px;text-align:center;">
                  <span style="display:inline-block;padding:14px 28px;background:#ecfdf5;border:2px solid #10b981;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:6px;color:#004b57;">%s</span>
                </p>
                <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Ce code expire dans <strong>10 minutes</strong>.</p>
                <p style="margin:0;color:#64748b;font-size:14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Ne partagez jamais ce code.</p>
                """.formatted(escape(prenom), escape(code));
    }

    static String otpPlain(String prenom, String code) {
        return "Bonjour " + prenom + ",\n\n"
                + "Votre code de verification Smart Kids Academy : " + code + "\n\n"
                + "Ce code expire dans 10 minutes.\n"
                + "Si vous n'avez pas demande cette reinitialisation, ignorez cet email.\n"
                + "Ne partagez jamais ce code.\n\n"
                + FOOTER;
    }

    static String inscriptionHtml(String name) {
        return """
                <p style="margin:0 0 12px;">Bonjour <strong>%s</strong>,</p>
                <p style="margin:0 0 12px;">Votre inscription formateur a bien ete enregistree sur Smart Kids Academy.</p>
                <p style="margin:0 0 12px;">Votre compte est <strong>en attente de validation</strong> par le Directeur. Vous recevrez un second email des que votre compte sera active.</p>
                <p style="margin:0;color:#64748b;font-size:14px;">En attendant, vous ne pouvez pas encore vous connecter.</p>
                """.formatted(escape(name));
    }

    static String inscriptionPlain(String name) {
        return "Bonjour " + name + ",\n\n"
                + "Votre inscription formateur a bien ete enregistree.\n\n"
                + "Votre compte est en attente de validation par le Directeur. "
                + "Vous recevrez un second email des que votre compte sera active.\n\n"
                + FOOTER;
    }

    static String valideHtml(String name) {
        return """
                <p style="margin:0 0 12px;">Bonjour <strong>%s</strong>,</p>
                <p style="margin:0 0 12px;">Bonne nouvelle : le Directeur a valide votre compte formateur.</p>
                <p style="margin:0;">Vous pouvez maintenant vous connecter avec votre email et le mot de passe choisi lors de l'inscription.</p>
                """.formatted(escape(name));
    }

    static String validePlain(String name) {
        return "Bonjour " + name + ",\n\n"
                + "Le Directeur a valide votre compte formateur.\n\n"
                + "Vous pouvez maintenant vous connecter avec votre email et votre mot de passe d'inscription.\n\n"
                + FOOTER;
    }

    static String credentialsHtml(String name, String roleLabel, String email, String motDePasse, boolean capitalWarning) {
        String warning = capitalWarning
                ? "<p style=\"margin:12px 0 0;color:#b45309;font-size:13px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;\">"
                        + "&#9888;&#65039; Attention : la <strong>premiere lettre</strong> du mot de passe est en <strong>MAJUSCULE</strong>, "
                        + "tout le reste en minuscules. Respectez bien cette casse en le saisissant.</p>"
                : "";
        return """
                <p style="margin:0 0 12px;">Bonjour <strong>%s</strong>,</p>
                <p style="margin:0 0 12px;">Votre compte <strong>%s</strong> sur Smart Kids Academy est prêt. Vous pouvez vous connecter dès maintenant sur <strong>ska-management.com</strong> avec les identifiants suivants :</p>
                <table role="presentation" style="width:100%%;margin:0 0 12px;border-collapse:collapse;">
                  <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px 8px 0 0;font-size:13px;color:#64748b;">Identifiant (email)</td></tr>
                  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;border-top:none;font-size:16px;font-weight:600;color:#004b57;">%s</td></tr>
                  <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-size:13px;color:#64748b;">Mot de passe</td></tr>
                  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-size:16px;font-weight:600;color:#004b57;">%s</td></tr>
                </table>
                %s
                <p style="margin:12px 0 0;color:#64748b;font-size:14px;">Pour votre sécurité, nous vous recommandons de changer ce mot de passe après votre première connexion (menu Mon profil).</p>
                """.formatted(escape(name), escape(roleLabel), escape(email), escape(motDePasse), warning);
    }

    static String credentialsPlain(String name, String roleLabel, String email, String motDePasse, boolean capitalWarning) {
        String warning = capitalWarning
                ? "\nAttention : la premiere lettre du mot de passe est en MAJUSCULE, tout le reste en minuscules. "
                        + "Respectez bien cette casse en le saisissant.\n"
                : "";
        return "Bonjour " + name + ",\n\n"
                + "Votre compte " + roleLabel + " sur Smart Kids Academy est pret. "
                + "Vous pouvez vous connecter des maintenant sur ska-management.com avec les identifiants suivants :\n\n"
                + "Identifiant (email) : " + email + "\n"
                + "Mot de passe : " + motDePasse + "\n"
                + warning + "\n"
                + "Pour votre securite, nous vous recommandons de changer ce mot de passe apres votre premiere connexion (menu Mon profil).\n\n"
                + FOOTER;
    }

    static String notificationPlain(String message) {
        return message + "\n\n" + FOOTER;
    }

    static String notificationHtml(String message) {
        String escaped = escape(message).replace("\n", "<br/>");
        return "<p style=\"margin:0;white-space:pre-line;\">" + escaped + "</p>";
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
