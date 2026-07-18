package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.EvaluationSession;
import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.util.PdfTextUtil;
import com.nehemiahlab.platform.util.RapportAnnuelUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Génère le « Rapport Exécution SKA Program » (format officiel type Yoto Sud)
 * à partir des seules données saisies par le formateur en séance.
 */
@Service
public class RapportExecutionSeancePdfBuilder {

    private static final Color SKA_TEAL = new Color(0, 75, 87);
    private static final Color SKA_INK = new Color(15, 23, 42);
    private static final Color MUTED = new Color(71, 85, 105);
    private static final DateTimeFormatter REPORT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter CRENEAU_TIME = DateTimeFormatter.ofPattern("H'h'mm");
    private static final Locale FR = Locale.FRENCH;

    private static final String PREAMBULE_1 =
            "Pour contrer la problématique des défis en matière d'employabilité à laquelle certains jeunes se retrouvent "
                    + "confrontés après avoir suivi le programme Compassion Togo jusqu'à leurs 22 ans, les Églises Partenaires "
                    + "de Compassion Togo ont uni leurs forces en 2021 pour créer Nehemiah Youth Empowerment.";
    private static final String PREAMBULE_2 =
            "Nehemiah Lab accompagne les jeunes vers l'innovation et le Programme Smart Kids Academy (SKA) initie les enfants "
                    + "aux technologies de pointe (programmation, électronique, modélisation 3D) en complément de l'éducation classique.";
    private static final String PREAMBULE_3 =
            "Ce rapport d'exécution consolide les séances terrain saisies par les SKA Trainers : effectifs présents, "
                    + "créneaux horaires, état des équipements et défis rencontrés.";

    private static final List<String> MESURES_DEFIS = List.of(
            "Exhorter les CDEJ a acquérir des PC complementaires et prendre des dispositions mere dans les salles (routeurs wifi) ;",
            "Encourager les SKA Trainers a s'adapter au terrain et collaborer avec les animateurs pour le transport vers les CDEJ ;",
            "Exhorter les CDEJ a amenager les salles de formation et suivre l'assiduite des participants ;",
            "Encourager les SKA Trainers a faire des entretiens individuels avec chaque enfant (2 par seance) pour connaitre motivation et reves."
    );

    public byte[] buildSingle(SessionCours session, List<EvaluationSession> evaluations) throws IOException {
        return build(List.of(session), Map.of(session.getId(), evaluations), null, null, null, null);
    }

    public byte[] build(
            List<SessionCours> sessions,
            Map<Long, List<EvaluationSession>> evaluationsBySessionId,
            String clusterLabel,
            String regionLabel,
            LocalDate periodeDebut,
            LocalDate periodeFin
    ) throws IOException {
        List<SessionCours> ordered = sessions.stream()
                .filter(s -> s.getHeureDebut() != null)
                .sorted(Comparator.comparing(SessionCours::getHeureDebut))
                .toList();

        String scope = buildScopeLabel(clusterLabel, regionLabel, periodeDebut, periodeFin);

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 42f;

            PageCtx ctx = newPage(document, titleFont, bodyFont, margin,
                    "Rapport Exécution SKA Program",
                    scope != null ? scope : "Séances terrain — données formateurs",
                    metaHeader(periodeDebut, periodeFin, ordered.size()));

            ctx.y = drawLine(ctx, "Préambule", titleFont, SKA_TEAL);
            ctx.y -= 4f;
            for (String block : List.of(PREAMBULE_1, PREAMBULE_2, PREAMBULE_3)) {
                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 50f);
                ctx.y = PdfTextUtil.drawWrapped(ctx.content, block, bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 8f;
            }
            ctx.y -= 6f;

            Map<LocalDate, List<SessionCours>> byDate = ordered.stream()
                    .collect(Collectors.groupingBy(s -> s.getHeureDebut().toLocalDate(), LinkedHashMap::new, Collectors.toList()));

            int sectionNum = 1;
            for (Map.Entry<LocalDate, List<SessionCours>> dayEntry : byDate.entrySet()) {
                LocalDate day = dayEntry.getKey();
                List<SessionCours> daySessions = dayEntry.getValue().stream()
                        .sorted(Comparator.comparing(SessionCours::getHeureDebut))
                        .toList();

                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 80f);
                String dayTitle = sectionNum + ". Point sur le déroulement du programme durant la séance du "
                        + formatJourComplet(day);
                ctx.y = PdfTextUtil.drawWrapped(ctx.content, dayTitle, titleFont, 10.5f, margin, ctx.y, ctx.maxW, 14f, SKA_INK) - 6f;

                String intro = "Dans la journée du " + formatJourComplet(day)
                        + " les séances du programme SKA ont été effectuées suivant le tableau ci-dessous "
                        + "(effectif des participants présents et défis majeurs rencontrés — données saisies par le formateur).";
                ctx.y = PdfTextUtil.drawWrapped(ctx.content, intro, bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 10f;

                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 30f);
                ctx.y = drawLine(ctx,
                        "N° | N°CDEJ / CDEJ | Contacts | Lieu | SKA Trainer | Créneau | P | Défis",
                        bodyFont, SKA_TEAL);
                ctx.y -= 4f;

                int rowNum = 1;
                int totalPresents = 0;
                for (SessionCours session : daySessions) {
                    List<EvaluationSession> evals = evaluationsBySessionId.getOrDefault(session.getId(), List.of());
                    int presents = (int) evals.stream().filter(EvaluationSession::isPresent).count();
                    totalPresents += presents;

                    ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 70f);
                    ctx.y = drawSessionRow(ctx, rowNum, session, presents, bodyFont, titleFont);
                    rowNum++;
                }

                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 40f);
                ctx.y = drawLine(ctx, "T " + totalPresents, titleFont, SKA_INK);
                ctx.y -= 8f;
                ctx.y = drawLine(ctx, "Les mesures proposées pour relever les défis", titleFont, SKA_TEAL);
                ctx.y -= 4f;
                for (String mesure : MESURES_DEFIS) {
                    ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, scope, 30f);
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content, "● " + mesure, bodyFont, 8.5f, margin, ctx.y, ctx.maxW, 11f, MUTED) - 4f;
                }
                ctx.y -= 12f;
                sectionNum++;
            }

            if (ordered.isEmpty()) {
                ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                        "Aucune séance clôturée sur la période sélectionnée avec des données formateur.",
                        bodyFont, 10f, margin, ctx.y, ctx.maxW, 14f, MUTED);
            }

            ctx.content.close();
            stampAllFooters(document, bodyFont, margin);
            document.save(out);
            return out.toByteArray();
        }
    }

    private float drawSessionRow(
            PageCtx ctx, int rowNum, SessionCours session, int presents,
            PDType1Font bodyFont, PDType1Font titleFont
    ) throws IOException {
        Centre centre = session.getCentre();
        User formateur = session.getFormateur();

        String codeCdej = centre != null && centre.getCodeCdej() != null ? centre.getCodeCdej() : "-";
        String nomCdej = centre != null && centre.getNom() != null ? centre.getNom() : "-";
        String contacts = centreContacts(centre);
        String lieu = centre != null
                ? (centre.getLieuFormation() != null && !centre.getLieuFormation().isBlank()
                ? centre.getLieuFormation()
                : (centre.getVille() != null ? centre.getVille() : "-"))
                : "-";
        String trainer = formateur != null
                ? formateur.getPrenom() + " " + formateur.getNom()
                : "-";
        String trainerContact = formateur != null && formateur.getTelephone() != null
                ? formateur.getTelephone()
                : (centre != null && centre.getTelephoneFormateur() != null ? centre.getTelephoneFormateur() : "-");
        String creneau = formatCreneau(session);
        String module = session.getModuleFait() != null && !session.getModuleFait().isBlank()
                ? session.getModuleFait() : (session.getTitre() != null ? session.getTitre() : "-");
        String defis = buildDefis(session);

        String header = String.format("%02d | %s %s | %s | %s | %s (%s) | %s | %d |",
                rowNum, codeCdej, nomCdej, contacts, lieu, trainer, trainerContact, creneau, presents);
        float y = PdfTextUtil.drawWrapped(ctx.content, header, titleFont, 8.5f, ctx.margin, ctx.y, ctx.maxW, 11f, SKA_INK) - 2f;
        y = PdfTextUtil.drawWrapped(ctx.content, "Module : " + module, bodyFont, 8f, ctx.margin + 8f, y, ctx.maxW - 8f, 10f, MUTED) - 2f;
        y = PdfTextUtil.drawWrapped(ctx.content, defis, bodyFont, 8.5f, ctx.margin + 8f, y, ctx.maxW - 8f, 11f, MUTED) - 8f;
        ctx.y = y;
        return y;
    }

    private static String buildDefis(SessionCours session) {
        List<String> parts = new ArrayList<>();
        if (session.getDefisSession() != null && !session.getDefisSession().isBlank()) {
            parts.add(session.getDefisSession().trim());
        }
        if (session.getEtatEquipements() != null && !session.getEtatEquipements().isBlank()) {
            parts.add("Équipements : " + session.getEtatEquipements().trim());
        }
        if (parts.isEmpty()) return "RAS";
        return String.join(" + ", parts);
    }

    private static String centreContacts(Centre centre) {
        if (centre == null) return "-";
        List<String> phones = new ArrayList<>();
        if (centre.getTelephoneCoordinateur() != null && !centre.getTelephoneCoordinateur().isBlank()) {
            phones.add(centre.getTelephoneCoordinateur().trim());
        }
        if (centre.getTelephoneResponsable() != null && !centre.getTelephoneResponsable().isBlank()) {
            phones.add(centre.getTelephoneResponsable().trim());
        }
        return phones.isEmpty() ? "-" : String.join(" / ", phones);
    }

    private static String formatCreneau(SessionCours session) {
        if (session.getHeureDebut() == null) return "-";
        String start = session.getHeureDebut().toLocalTime().format(CRENEAU_TIME);
        String end;
        if (session.getHeureFin() != null) {
            end = session.getHeureFin().toLocalTime().format(CRENEAU_TIME);
        } else if (session.getDureeReelleMinutes() != null && session.getDureeReelleMinutes() > 0) {
            end = session.getHeureDebut().plusMinutes(session.getDureeReelleMinutes()).toLocalTime().format(CRENEAU_TIME);
        } else if (session.getDureePrevueMinutes() != null && session.getDureePrevueMinutes() > 0) {
            end = session.getHeureDebut().plusMinutes(session.getDureePrevueMinutes()).toLocalTime().format(CRENEAU_TIME);
        } else {
            end = "-";
        }
        return start + "-" + end;
    }

    private static String formatJourComplet(LocalDate day) {
        String jour = day.getDayOfWeek().getDisplayName(TextStyle.FULL, FR);
        if (!jour.isEmpty()) {
            jour = jour.substring(0, 1).toUpperCase(FR) + jour.substring(1);
        }
        String mois = day.getMonth().getDisplayName(TextStyle.FULL, FR);
        if (!mois.isEmpty()) {
            mois = mois.substring(0, 1).toUpperCase(FR) + mois.substring(1);
        }
        return jour + " " + day.getDayOfMonth() + " " + mois + " " + day.getYear();
    }

    private static String buildScopeLabel(String cluster, String region, LocalDate debut, LocalDate fin) {
        List<String> parts = new ArrayList<>();
        if (cluster != null && !cluster.isBlank()) parts.add("Cluster " + cluster);
        if (region != null && !region.isBlank()) parts.add("Région " + region);
        if (debut != null && fin != null) {
            parts.add("Période " + debut.format(REPORT_DATE) + " → " + fin.format(REPORT_DATE));
        }
        return parts.isEmpty() ? null : String.join(" · ", parts);
    }

    private Map<String, String> metaHeader(LocalDate debut, LocalDate fin, int nbSeances) {
        Map<String, String> meta = new LinkedHashMap<>();
        if (debut != null) meta.put("Période début", debut.format(REPORT_DATE));
        if (fin != null) meta.put("Période fin", fin.format(REPORT_DATE));
        meta.put("Séances incluses", String.valueOf(nbSeances));
        meta.put("Généré le", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        meta.put("Source", "Données saisies par les formateurs (séances clôturées)");
        return meta;
    }

    private float drawLine(PageCtx ctx, String text, PDType1Font font, Color color) throws IOException {
        ctx.content.beginText();
        ctx.content.setNonStrokingColor(color);
        ctx.content.setFont(font, 10f);
        ctx.content.newLineAtOffset(ctx.margin, ctx.y);
        ctx.content.showText(PdfTextUtil.sanitize(text));
        ctx.content.endText();
        return ctx.y - 14f;
    }

    private PageCtx newPage(
            PDDocument doc, PDType1Font titleFont, PDType1Font bodyFont, float margin,
            String title, String subtitle, Map<String, String> meta
    ) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDPageContentStream content = new PDPageContentStream(doc, page);
        float topY = page.getMediaBox().getHeight() - 40f;
        float pageWidth = page.getMediaBox().getWidth();

        content.setNonStrokingColor(SKA_TEAL);
        content.addRect(0, topY - 42f, pageWidth, 42f);
        content.fill();
        content.beginText();
        content.setNonStrokingColor(Color.WHITE);
        content.setFont(titleFont, 12);
        content.newLineAtOffset(margin, topY - 24f);
        content.showText("SMART KIDS ACADEMY — SKA Program");
        content.endText();

        float y = topY - 58f;
        content.beginText();
        content.setFont(titleFont, 14);
        content.setNonStrokingColor(SKA_INK);
        content.newLineAtOffset(margin, y);
        content.showText(PdfTextUtil.sanitize(title));
        content.endText();
        y -= 16f;

        content.beginText();
        content.setFont(bodyFont, 10);
        content.setNonStrokingColor(MUTED);
        content.newLineAtOffset(margin, y);
        content.showText(PdfTextUtil.sanitize(subtitle));
        content.endText();
        y -= 18f;

        for (Map.Entry<String, String> e : meta.entrySet()) {
            content.beginText();
            content.setFont(bodyFont, 8.5f);
            content.newLineAtOffset(margin, y);
            content.showText(PdfTextUtil.sanitize(e.getKey() + " : " + (e.getValue() != null ? e.getValue() : "—")));
            content.endText();
            y -= 12f;
        }
        y -= 8f;

        PageCtx ctx = new PageCtx();
        ctx.doc = doc;
        ctx.page = page;
        ctx.content = content;
        ctx.y = y;
        ctx.margin = margin;
        ctx.maxW = pageWidth - 2 * margin;
        return ctx;
    }

    private PageCtx ensureSpace(PageCtx ctx, PDDocument doc, PDType1Font titleFont, PDType1Font bodyFont,
                                float margin, String subtitle, float needed) throws IOException {
        if (ctx.y >= needed) return ctx;
        ctx.content.close();
        return newPage(doc, titleFont, bodyFont, margin,
                "Rapport Exécution SKA Program (suite)",
                subtitle != null ? subtitle : "",
                Map.of("Suite", "—"));
    }

    private void stampAllFooters(PDDocument document, PDType1Font bodyFont, float margin) throws IOException {
        int total = document.getNumberOfPages();
        for (int i = 0; i < total; i++) {
            PDPage p = document.getPage(i);
            float w = p.getMediaBox().getWidth();
            try (PDPageContentStream footer = new PDPageContentStream(document, p, AppendMode.APPEND, true, true)) {
                footer.setNonStrokingColor(SKA_TEAL);
                footer.addRect(0, 0, w, 28f);
                footer.fill();
                footer.beginText();
                footer.setFont(bodyFont, 8);
                footer.setNonStrokingColor(Color.WHITE);
                footer.newLineAtOffset(margin, 10f);
                footer.showText(PdfTextUtil.sanitize(
                        RapportAnnuelUtil.SKA_FOOTER_LEFT + "  " + RapportAnnuelUtil.SKA_FOOTER_PHONE
                                + "  " + RapportAnnuelUtil.SKA_FOOTER_WEB
                                + "  ·  Rapport exécution séance  ·  Page " + (i + 1) + "/" + total
                ));
                footer.endText();
            }
        }
    }

    private static class PageCtx {
        PDDocument doc;
        PDPage page;
        PDPageContentStream content;
        float y;
        float margin;
        float maxW;
    }
}
