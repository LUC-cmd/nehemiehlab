package com.nehemiahlab.platform.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.CommentaireRepository;
import com.nehemiahlab.platform.repository.EvaluationSessionRepository;
import com.nehemiahlab.platform.repository.RapportSyntheseCentreRepository;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import com.nehemiahlab.platform.repository.SignalementRepository;
import com.nehemiahlab.platform.util.PdfTextUtil;
import com.nehemiahlab.platform.util.RapportAnnuelUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RapportFormateurPdfBuilder {

    private static final Color SKA_TEAL = new Color(0, 75, 87);
    private static final Color SKA_INK = new Color(15, 23, 42);
    private static final Color MUTED = new Color(71, 85, 105);
    private static final DateTimeFormatter REPORT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private RapportSyntheseCentreRepository syntheseRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @Autowired
    private CommentaireRepository commentaireRepository;

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private SignalementRepository signalementRepository;

    public byte[] build(
            Centre centre,
            User formateur,
            List<Eleve> eleves,
            RapportSyntheseCentre synthese,
            LocalDate debut,
            LocalDate fin,
            String moduleLabel
    ) throws IOException {
        int annee = synthese != null && synthese.getAnnee() != null
                ? synthese.getAnnee()
                : LocalDate.now().getYear();

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 42f;

            PageCtx ctx = newPage(document, titleFont, bodyFont, margin,
                    "Rapport des Formateurs — Exécution SKA Program",
                    moduleLabel,
                    centreHeader(centre, formateur, debut, fin));

            ctx.y = drawLine(ctx, "PRÉSENTATION DU RAPPORT CDEJ", titleFont, SKA_TEAL);
            ctx.y -= 4f;

            String periodeLabel = "Période d'exécution du module : du "
                    + debut.format(REPORT_DATE) + " au " + fin.format(REPORT_DATE);
            ctx.y = PdfTextUtil.drawWrapped(ctx.content, periodeLabel, titleFont, 10f, margin, ctx.y, ctx.maxW, 14f, SKA_TEAL) - 8f;

            int seancesTerrain = countCentreSessionsInPeriod(centre.getId(), debut, fin);
            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    "Nombre de séances terrain sur la période : " + seancesTerrain,
                    bodyFont, 9.5f, margin, ctx.y, ctx.maxW, 13f, MUTED) - 8f;

            int debutF = synthese != null && synthese.getEffectifDebutFilles() != null
                    ? synthese.getEffectifDebutFilles() : countSexe(eleves, "F");
            int debutG = synthese != null && synthese.getEffectifDebutGarcons() != null
                    ? synthese.getEffectifDebutGarcons() : countSexe(eleves, "M");
            int finalF = synthese != null && synthese.getEffectifFinalFilles() != null
                    ? synthese.getEffectifFinalFilles() : countActiveSexe(eleves, "F", debut, fin);
            int finalG = synthese != null && synthese.getEffectifFinalGarcons() != null
                    ? synthese.getEffectifFinalGarcons() : countActiveSexe(eleves, "M", debut, fin);

            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    centreLabel(centre) + "  |  Lieu : " + lieuLabel(centre),
                    bodyFont, 10f, margin, ctx.y, ctx.maxW, 14f, SKA_INK) - 6f;
            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    "Effectif début : " + (debutF + debutG) + "  (F: " + debutF + "  G: " + debutG + ")"
                            + "  |  Effectif final : " + (finalF + finalG) + "  (F: " + finalF + "  G: " + finalG + ")",
                    bodyFont, 9.5f, margin, ctx.y, ctx.maxW, 13f, MUTED) - 4f;

            String trainerContact = formateurContact(formateur);
            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    "SKA Trainer : " + trainerContact,
                    bodyFont, 9.5f, margin, ctx.y, ctx.maxW, 13f, MUTED) - 4f;
            String coordContact = centre.getTelephoneCoordinateur() != null
                    ? centre.getTelephoneCoordinateur()
                    : (centre.getCoordinateurPrenom() != null
                    ? centre.getCoordinateurPrenom() + " " + (centre.getCoordinateurNom() != null ? centre.getCoordinateurNom() : "")
                    : "—");
            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    "Coordinateur CDEJ : " + coordContact,
                    bodyFont, 9.5f, margin, ctx.y, ctx.maxW, 13f, MUTED) - 10f;

            ProjectStats stats = computeProjectStats(eleves, debut, fin, synthese);
            ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                    "Projets libres partie 01 : " + stats.p1
                            + "  |  partie 02 : " + stats.p2
                            + "  |  non achevés : " + stats.nonAcheves
                            + "  |  groupe : " + stats.groupe
                            + "  |  contextuels : " + stats.contextuels
                            + "  |  présentés : " + stats.presentes,
                    bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 12f;

            ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, moduleLabel, centre, formateur, debut, fin, 120f);
            ctx.y = drawLine(ctx, "Appréciation des participants (données sur la période ci-dessus)", titleFont, SKA_INK);
            ctx.y -= 6f;

            List<Eleve> elevesPeriode = eleves.stream()
                    .filter(e -> hasAnyActivityInPeriod(e.getId(), debut, fin))
                    .toList();
            if (elevesPeriode.isEmpty()) {
                elevesPeriode = eleves;
            }

            int num = 1;
            for (Eleve eleve : elevesPeriode) {
                ChildRow row = buildChildRow(eleve, debut, fin);
                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, moduleLabel, centre, formateur, debut, fin, 95f);

                String header = num + ". " + eleve.getPrenom() + " " + eleve.getNom()
                        + "  |  " + (eleve.getSexe() != null ? eleve.getSexe() : "-")
                        + "  |  " + eleve.getAge() + " ans  |  " + (eleve.getClasse() != null ? eleve.getClasse() : "-")
                        + "  |  Nbre séances suivi : " + row.seancesSuivies + "  |  " + row.niveau;
                ctx.y = PdfTextUtil.drawWrapped(ctx.content, header, titleFont, 9f, margin, ctx.y, ctx.maxW, 12f, SKA_TEAL) - 2f;

                String projetLine = "Projet : " + row.projetNom;
                ctx.y = PdfTextUtil.drawWrapped(ctx.content, projetLine, bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, SKA_INK) - 2f;

                if (row.probleme != null && !row.probleme.isBlank()) {
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                            "Problème : " + row.probleme, bodyFont, 8.5f, margin, ctx.y, ctx.maxW, 11f, MUTED) - 2f;
                }
                if (row.solution != null && !row.solution.isBlank()) {
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                            "Solution : " + row.solution, bodyFont, 8.5f, margin, ctx.y, ctx.maxW, 11f, MUTED) - 2f;
                }
                ctx.y = PdfTextUtil.drawWrapped(ctx.content,
                        "Observations : " + row.observations,
                        bodyFont, 8.5f, margin, ctx.y, ctx.maxW, 11f, MUTED) - 10f;
                num++;
            }

            ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, moduleLabel, centre, formateur, debut, fin, 100f);
            ctx.y = drawLine(ctx, "Synthèse — défis, leçons, propositions et perspectives", titleFont, SKA_INK);
            ctx.y -= 6f;
            drawSyntheseTable(ctx, synthese, bodyFont, margin);

            if (synthese != null) {
                ctx = ensureSpace(ctx, document, titleFont, bodyFont, margin, moduleLabel, centre, formateur, debut, fin, 80f);
                if (synthese.getAime() != null && !synthese.getAime().isBlank()) {
                    ctx.y = drawLine(ctx, "Qu'as-tu aimé le plus ?", titleFont, SKA_TEAL);
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content, synthese.getAime(), bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 8f;
                }
                if (synthese.getPasAime() != null && !synthese.getPasAime().isBlank()) {
                    ctx.y = drawLine(ctx, "Qu'est-ce que tu n'as pas aimé ?", titleFont, SKA_TEAL);
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content, synthese.getPasAime(), bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 8f;
                }
                if (synthese.getVision() != null && !synthese.getVision().isBlank()) {
                    ctx.y = drawLine(ctx, "Vision / perspective du programme", titleFont, SKA_TEAL);
                    ctx.y = PdfTextUtil.drawWrapped(ctx.content, synthese.getVision(), bodyFont, 9f, margin, ctx.y, ctx.maxW, 12f, MUTED) - 8f;
                }
            }

            ctx.content.close();
            stampAllFooters(document, bodyFont, margin);
            document.save(out);
            return out.toByteArray();
        }
    }

    private void drawSyntheseTable(PageCtx ctx, RapportSyntheseCentre synthese, PDType1Font bodyFont, float margin) throws IOException {
        List<Map<String, String>> rows = parseSyntheseRows(synthese);
        if (rows.isEmpty()) {
            rows = defaultSyntheseRows();
        }
        for (Map<String, String> row : rows) {
            String line = row.getOrDefault("categorie", "—") + " — Défis: "
                    + row.getOrDefault("defis", "—")
                    + " | Leçons: " + row.getOrDefault("lecons", "—")
                    + " | Trainer: " + row.getOrDefault("propsTrainer", "—");
            ctx.y = PdfTextUtil.drawWrapped(ctx.content, line, bodyFont, 8f, margin, ctx.y, ctx.maxW, 11f, MUTED) - 6f;
        }
    }

    private List<Map<String, String>> parseSyntheseRows(RapportSyntheseCentre synthese) {
        if (synthese == null || synthese.getSyntheseTable() == null || synthese.getSyntheseTable().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(synthese.getSyntheseTable(), new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<Map<String, String>> defaultSyntheseRows() {
        return List.of(
                row("Cadre", "Manque de matériel et connexion", "Prévoir versions hors ligne", "Télécharger ressources à l'avance"),
                row("Modules", "Modules longs ou complexes", "Simplifier et contextualiser", "Fiches courtes et jeux"),
                row("Enfants", "Absences et manque de concentration", "Méthodes ludiques efficaces", "Jeux, chansons, récompenses"),
                row("CDEJ", "Coordination limitée", "Planifier en amont", "Co-encadrement avec trainers"),
                row("Nehemiah Lab", "Suivi terrain insuffisant", "Reporting simple et rapide", "Visites et accompagnement"),
                row("SKA Trainer", "Fatigue et gestion du temps", "Mieux organiser le planning", "Séances de recyclage")
        );
    }

    private Map<String, String> row(String cat, String defis, String lecons, String props) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("categorie", cat);
        m.put("defis", defis);
        m.put("lecons", lecons);
        m.put("propsTrainer", props);
        return m;
    }

    private ChildRow buildChildRow(Eleve eleve, LocalDate debut, LocalDate fin) {
        List<EvaluationSession> evals = filterEvalsInPeriod(eleve.getId(), debut, fin);

        long suivies = evals.stream().filter(EvaluationSession::isPresent).count();
        double avg = evals.stream()
                .filter(e -> e.isPresent() && e.getNote() != null)
                .mapToDouble(e -> e.getNote() > 10 ? e.getNote() / 2.0 : e.getNote())
                .average().orElse(0);

        Projet p = eleve.getProjet();
        String projetNom = p != null && p.getNom() != null && !p.getNom().isBlank() ? p.getNom() : "—";
        String probleme = p != null ? p.getProbleme() : null;
        String solution = p != null ? p.getSolution() : null;

        EvaluationSession finalEval = evals.stream()
                .filter(e -> e.isPresent() && e.isProjetFinal())
                .max(Comparator.comparing(
                        e -> e.getSessionCours().getHeureDebut(),
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
        if (finalEval != null) {
            if (finalEval.getProjetTravaille() != null && !finalEval.getProjetTravaille().isBlank()) {
                projetNom = finalEval.getProjetTravaille();
            }
            if (finalEval.getProjetProbleme() != null && !finalEval.getProjetProbleme().isBlank()) {
                probleme = finalEval.getProjetProbleme();
            }
            if (finalEval.getProjetSolution() != null && !finalEval.getProjetSolution().isBlank()) {
                solution = finalEval.getProjetSolution();
            }
        }

        if ((probleme == null || probleme.isBlank()) && p != null && p.getDescription() != null) {
            probleme = p.getDescription();
        }

        String sessionComments = evals.stream()
                .filter(e -> e.getCommentaire() != null && !e.getCommentaire().isBlank())
                .map(EvaluationSession::getCommentaire)
                .collect(Collectors.joining(" "));

        String obs = RapportAnnuelUtil.buildObservations(
                p != null ? p.getObservationsRapport() : null,
                p != null ? p.getPointsForts() : null,
                sessionComments
        );

        List<Commentaire> comments = commentaireRepository.findByEleveIdOrderByCreatedAtDesc(eleve.getId());
        if (comments != null && !comments.isEmpty()) {
            String extra = comments.stream().limit(2).map(Commentaire::getContenu).filter(Objects::nonNull).collect(Collectors.joining(" "));
            obs = RapportAnnuelUtil.buildObservations(obs.equals("—") ? null : obs, extra, null);
        }

        String alertesRapport = signalementRepository.findByEleveIdOrderByCreatedAtDesc(eleve.getId()).stream()
                .filter(Signalement::isInclureDansRapport)
                .filter(s -> s.getCreatedAt() != null)
                .filter(s -> {
                    LocalDate d = s.getCreatedAt().toLocalDate();
                    return !d.isBefore(debut) && !d.isAfter(fin);
                })
                .map(s -> {
                    String prefix = "URGENTE".equalsIgnoreCase(s.getPriorite()) ? "[Alerte urgente] " : "[Alerte] ";
                    return prefix + (s.getDescription() != null ? s.getDescription() : "");
                })
                .filter(t -> !t.isBlank())
                .collect(Collectors.joining(" "));
        if (!alertesRapport.isBlank()) {
            obs = RapportAnnuelUtil.buildObservations(obs.equals("—") ? null : obs, alertesRapport, null);
        }

        return new ChildRow(
                (int) suivies,
                RapportAnnuelUtil.resolveNiveauMaitrise(p != null ? p.getNiveauMaitrise() : null, avg > 0 ? avg : null),
                projetNom,
                probleme,
                solution,
                obs
        );
    }

    private ProjectStats computeProjectStats(List<Eleve> eleves, LocalDate debut, LocalDate fin, RapportSyntheseCentre synthese) {
        if (synthese != null && synthese.getProjetsLibresP1() != null) {
            return new ProjectStats(
                    nvl(synthese.getProjetsLibresP1()),
                    nvl(synthese.getProjetsLibresP2()),
                    nvl(synthese.getProjetsNonAcheves()),
                    nvl(synthese.getProjetsGroupe()),
                    nvl(synthese.getProjetsContextuels()),
                    nvl(synthese.getProjetsPresentes())
            );
        }
        int p1 = 0, p2 = 0, nonAcheves = 0, contextuels = 0, presentes = 0;
        for (Eleve e : eleves) {
            List<EvaluationSession> evals = filterEvalsInPeriod(e.getId(), debut, fin);
            boolean workedP1 = evals.stream().anyMatch(ev -> ev.isPresent()
                    && ev.getProjetTravaille() != null && !ev.getProjetTravaille().isBlank());
            boolean workedP2 = evals.stream().filter(EvaluationSession::isPresent).count() >= 2;
            if (workedP1) p1++;
            if (workedP2) p2++;

            EvaluationSession finalEval = evals.stream()
                    .filter(ev -> ev.isPresent() && ev.isProjetFinal())
                    .max(Comparator.comparing(
                            ev -> ev.getSessionCours().getHeureDebut(),
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);

            Projet p = e.getProjet();
            if (finalEval != null) {
                if (finalEval.getProjetProbleme() != null && !finalEval.getProjetProbleme().isBlank()) contextuels++;
                presentes++;
                continue;
            }
            if (p == null || p.getNom() == null || p.getNom().isBlank()) {
                if (evals.stream().anyMatch(EvaluationSession::isPresent)) nonAcheves++;
                continue;
            }
            int evo = p.getEvolution() != null ? p.getEvolution() : 0;
            if (evo >= 50) presentes++;
            if (p.getProbleme() != null && !p.getProbleme().isBlank()) contextuels++;
            if (evo > 0 && evo < 100) nonAcheves++;
        }
        return new ProjectStats(p1, p2, nonAcheves, 0, contextuels, presentes);
    }

    private List<EvaluationSession> filterEvalsInPeriod(Long eleveId, LocalDate debut, LocalDate fin) {
        return evaluationSessionRepository.findByEleveId(eleveId).stream()
                .filter(ev -> ev.getSessionCours() != null && ev.getSessionCours().getHeureDebut() != null)
                .filter(ev -> {
                    LocalDate d = ev.getSessionCours().getHeureDebut().toLocalDate();
                    return !d.isBefore(debut) && !d.isAfter(fin);
                })
                .toList();
    }

    private int countCentreSessionsInPeriod(Long centreId, LocalDate debut, LocalDate fin) {
        return (int) sessionCoursRepository.findByCentreIdOrderByCreatedAtDesc(centreId).stream()
                .filter(s -> s.getHeureDebut() != null)
                .filter(s -> {
                    LocalDate d = s.getHeureDebut().toLocalDate();
                    return !d.isBefore(debut) && !d.isAfter(fin);
                })
                .count();
    }

    private boolean hasAnyActivityInPeriod(Long eleveId, LocalDate debut, LocalDate fin) {
        return filterEvalsInPeriod(eleveId, debut, fin).stream().anyMatch(EvaluationSession::isPresent);
    }

    private int nvl(Integer v) { return v != null ? v : 0; }

    private int countSexe(List<Eleve> eleves, String sexe) {
        return (int) eleves.stream().filter(e -> sexe.equalsIgnoreCase(e.getSexe())).count();
    }

    private int countActiveSexe(List<Eleve> eleves, String sexe, LocalDate debut, LocalDate fin) {
        return (int) eleves.stream().filter(e -> sexe.equalsIgnoreCase(e.getSexe()))
                .filter(e -> hasPresenceInPeriod(e.getId(), debut, fin))
                .count();
    }

    private boolean hasPresenceInPeriod(Long eleveId, LocalDate debut, LocalDate fin) {
        return evaluationSessionRepository.findByEleveId(eleveId).stream()
                .anyMatch(ev -> ev.isPresent()
                        && ev.getSessionCours() != null
                        && ev.getSessionCours().getHeureDebut() != null
                        && !ev.getSessionCours().getHeureDebut().toLocalDate().isBefore(debut)
                        && !ev.getSessionCours().getHeureDebut().toLocalDate().isAfter(fin));
    }

    private String centreLabel(Centre c) {
        String code = c.getCodeCdej() != null ? c.getCodeCdej() + " CDEJ : " : "CDEJ : ";
        return code + c.getNom();
    }

    private String lieuLabel(Centre c) {
        if (c.getLieuFormation() != null && !c.getLieuFormation().isBlank()) return c.getLieuFormation();
        if (c.getVille() != null) return c.getVille();
        return c.getAdresse() != null ? c.getAdresse() : "—";
    }

    private String formateurContact(User f) {
        if (f == null) return "—";
        String tel = f.getTelephone() != null ? f.getTelephone() : "";
        String email = f.getEmail() != null ? f.getEmail() : "";
        return f.getPrenom() + " " + f.getNom() + (tel.isBlank() ? "" : " — " + tel) + (email.isBlank() ? "" : " — " + email);
    }

    private Map<String, String> centreHeader(Centre centre, User formateur, LocalDate debut, LocalDate fin) {
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Centre", centre.getNom());
        meta.put("Période", debut.format(REPORT_DATE) + " → " + fin.format(REPORT_DATE));
        meta.put("Formateur", formateur != null ? formateur.getPrenom() + " " + formateur.getNom() : "—");
        meta.put("Généré le", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        return meta;
    }

    private float drawLine(PageCtx ctx, String text, PDType1Font font, Color color) throws IOException {
        ctx.content.beginText();
        ctx.content.setNonStrokingColor(color);
        ctx.content.setFont(font, 11);
        ctx.content.newLineAtOffset(ctx.margin, ctx.y);
        ctx.content.showText(PdfTextUtil.sanitize(text));
        ctx.content.endText();
        return ctx.y - 16f;
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

    private PageCtx ensureSpace(
            PageCtx ctx, PDDocument doc, PDType1Font titleFont, PDType1Font bodyFont, float margin,
            String moduleLabel, Centre centre, User formateur, LocalDate debut, LocalDate fin, float needed
    ) throws IOException {
        if (ctx.y >= needed) return ctx;
        ctx.content.close();
        return newPage(doc, titleFont, bodyFont, margin,
                "Rapport formateur (suite)",
                moduleLabel,
                centreHeader(centre, formateur, debut, fin));
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
                                + "  ·  Page " + (i + 1) + "/" + total
                ));
                footer.endText();
            }
        }
    }

    public Optional<RapportSyntheseCentre> loadSynthese(
            Long centreId, String moduleLabel, LocalDate debut, LocalDate fin
    ) {
        return syntheseRepository.findByCentreIdAndModuleLabelAndDateDebutAndDateFin(
                centreId, moduleLabel, debut, fin);
    }

    public Map<String, Object> buildApercu(Centre centre, List<Eleve> eleves, LocalDate debut, LocalDate fin) {
        int seances = countCentreSessionsInPeriod(centre.getId(), debut, fin);
        long elevesActifs = eleves.stream().filter(e -> hasAnyActivityInPeriod(e.getId(), debut, fin)).count();
        long presences = eleves.stream()
                .flatMap(e -> filterEvalsInPeriod(e.getId(), debut, fin).stream())
                .filter(EvaluationSession::isPresent)
                .count();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periodeDebut", debut.toString());
        out.put("periodeFin", fin.toString());
        out.put("periodeLabel", debut.format(REPORT_DATE) + " → " + fin.format(REPORT_DATE));
        out.put("seancesTerrain", seances);
        out.put("elevesInscrits", eleves.size());
        out.put("elevesActifs", elevesActifs);
        out.put("totalPresences", presences);
        return out;
    }

    private static class PageCtx {
        PDDocument doc;
        PDPage page;
        PDPageContentStream content;
        float y;
        float margin;
        float maxW;
    }

    private record ChildRow(int seancesSuivies, String niveau, String projetNom, String probleme, String solution, String observations) {}
    private record ProjectStats(int p1, int p2, int nonAcheves, int groupe, int contextuels, int presentes) {}
}
