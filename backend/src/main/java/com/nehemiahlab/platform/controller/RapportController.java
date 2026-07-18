package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Commentaire;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.ModuleFormation;
import com.nehemiahlab.platform.model.EvaluationSession;
import com.nehemiahlab.platform.model.Projet;
import com.nehemiahlab.platform.model.RapportSyntheseCentre;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.model.Signalement;
import com.nehemiahlab.platform.model.Transaction;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.CommentaireRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EvaluationSessionRepository;
import com.nehemiahlab.platform.repository.ModuleFormationRepository;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import com.nehemiahlab.platform.repository.SignalementRepository;
import com.nehemiahlab.platform.repository.TransactionRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.RapportExecutionSeancePdfBuilder;
import com.nehemiahlab.platform.service.RapportFormateurPdfBuilder;
import com.nehemiahlab.platform.util.PdfTextUtil;
import com.nehemiahlab.platform.util.RapportAnnuelUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.awt.Color;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/rapports")
@PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
public class RapportController {
    private static final Color SKA_TEAL = new Color(0, 75, 87);
    private static final Color SKA_TEAL_DARK = new Color(0, 55, 64);
    private static final Color SKA_CYAN = new Color(94, 217, 255);
    private static final Color SKA_ORANGE = new Color(244, 59, 29);
    private static final Color SKA_INK = new Color(15, 23, 42);
    private static final DateTimeFormatter REPORT_DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");
    private static final DateTimeFormatter REPORT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private ModuleFormationRepository moduleFormationRepository;

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @Autowired
    private SignalementRepository signalementRepository;

    @Autowired
    private CommentaireRepository commentaireRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private RapportFormateurPdfBuilder rapportFormateurPdfBuilder;

    @Autowired
    private RapportExecutionSeancePdfBuilder rapportExecutionSeancePdfBuilder;

    private CellStyle buildHeaderStyle(Workbook workbook) {
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setFontHeightInPoints((short) 10);

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        if (headerStyle instanceof XSSFCellStyle xssfStyle) {
            xssfStyle.setFillForegroundColor(new XSSFColor(new byte[]{0, 75, 87}, null));
        } else {
            headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
        }
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setWrapText(true);
        headerStyle.setBorderBottom(BorderStyle.MEDIUM);
        headerStyle.setBottomBorderColor(IndexedColors.LIGHT_BLUE.getIndex());
        return headerStyle;
    }

    private void finalizeExcelSheet(Sheet sheet, int columnCount) {
        finalizeExcelSheet(sheet, columnCount, null);
    }

    private void finalizeExcelSheet(Sheet sheet, int columnCount, String documentLabel) {
        sheet.createFreezePane(0, 1);
        if (sheet.getLastRowNum() >= 0) {
            sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, sheet.getLastRowNum()), 0, columnCount - 1));
            Row header = sheet.getRow(0);
            if (header != null) header.setHeightInPoints(30f);
        }
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
            int current = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.min(Math.max(current + 512, 12 * 256), 45 * 256));
        }
        sheet.setDisplayGridlines(false);
        sheet.getPrintSetup().setLandscape(columnCount > 7);
        sheet.getPrintSetup().setFitWidth((short) 1);
        sheet.getPrintSetup().setFitHeight((short) 0);
        sheet.setFitToPage(true);
        sheet.setAutobreaks(true);
        sheet.getHeader().setCenter("&BSMART KIDS ACADEMY&\"Arial,Regular\"\nRapport officiel");
        sheet.getHeader().setRight("Généré le " + LocalDateTime.now().format(REPORT_DATE_TIME));
        String footerText = RapportAnnuelUtil.SKA_FOOTER_LEFT + "   " + RapportAnnuelUtil.SKA_FOOTER_PHONE
                + "   " + RapportAnnuelUtil.SKA_FOOTER_WEB
                + (documentLabel != null ? "   ·   " + documentLabel : "")
                + "   ·   Page &P/&N";
        sheet.getFooter().setCenter(footerText);
        sheet.setMargin(Sheet.LeftMargin, 0.35);
        sheet.setMargin(Sheet.RightMargin, 0.35);
        sheet.setMargin(Sheet.TopMargin, 0.7);
        sheet.setMargin(Sheet.BottomMargin, 0.6);
    }

    /** Logo SKA en filigrane discret dans l'en-tete du classeur (colonne apres les donnees). */
    private void addLogoToSheet(Workbook workbook, Sheet sheet, int afterColumn) {
        try {
            ClassPathResource resource = new ClassPathResource("branding/ska-logo.png");
            if (!resource.exists()) return;
            byte[] bytes = resource.getInputStream().readAllBytes();
            int pictureIdx = workbook.addPicture(bytes, Workbook.PICTURE_TYPE_PNG);
            Drawing<?> drawing = sheet.createDrawingPatriarch();
            ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
            anchor.setCol1(afterColumn + 1);
            anchor.setRow1(0);
            anchor.setCol2(afterColumn + 3);
            anchor.setRow2(3);
            anchor.setAnchorType(ClientAnchor.AnchorType.MOVE_DONT_RESIZE);
            drawing.createPicture(anchor, pictureIdx);
        } catch (Exception ignored) {
            // Logo optionnel : on ignore silencieusement si la ressource est indisponible.
        }
    }

    private LocalDate parseDateOrDefault(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return LocalDate.parse(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private List<Long> allowedCentreIds(User user) {
        return centreAccessService.accessibleCentreIds(user);
    }

    private List<Long> filterCentreIds(User user, Long centreId, String region, String cluster) {
        return centreAccessService.filterCentreIds(user, centreId, region, cluster);
    }

    private enum ReportTemplate {
        APPRENANTS,
        ACTIVITES,
        FINANCIER,
        HEURES,
        SEANCES
    }

    private static class PdfPageState {
        private final PDPage page;
        private final PDPageContentStream content;
        private final float tableTopY;

        private PdfPageState(PDPage page, PDPageContentStream content, float tableTopY) {
            this.page = page;
            this.content = content;
            this.tableTopY = tableTopY;
        }
    }

    private byte[] buildPdfTableReport(
            String title,
            List<String> headers,
            List<List<String>> rows,
            Map<String, String> meta,
            ReportTemplate template,
            float[] columnWidths
    ) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            final float margin = 40f;
            final float minBottom = 110f;
            final float textLineHeight = 11f;
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            document.getDocumentInformation().setTitle(title);
            document.getDocumentInformation().setAuthor("Smart Kids Academy · Nehemiah Lab");
            document.getDocumentInformation().setSubject("Rapport officiel SKA");
            document.getDocumentInformation().setCreator("Plateforme Smart Kids Academy");

            PdfPageState state = createPdfPage(document, title, headers, meta, template, true, titleFont, bodyFont, columnWidths, margin);
            PDPageContentStream content = state.content;
            float y = state.tableTopY;
            int rowIndex = 0;

            for (List<String> row : rows) {
                List<List<String>> wrapped = new ArrayList<>();
                int maxLines = 1;
                for (int i = 0; i < headers.size(); i++) {
                    String cell = i < row.size() ? row.get(i) : "-";
                    int maxChars = Math.max(10, (int) (columnWidths[i] / 4.6f));
                    List<String> wrappedCell = splitLine(cell, maxChars);
                    wrapped.add(wrappedCell);
                    maxLines = Math.max(maxLines, wrappedCell.size());
                }
                float rowHeight = (maxLines * textLineHeight) + 8f;

                if (y - rowHeight < minBottom) {
                    content.close();
                    state = createPdfPage(
                            document,
                            title,
                            headers,
                            Map.of("Periode", "Suite"),
                            template,
                            false,
                            titleFont,
                            bodyFont,
                            columnWidths,
                            margin
                    );
                    content = state.content;
                    y = state.tableTopY;
                }

                float x = margin;
                if (rowIndex % 2 == 0) {
                    content.setNonStrokingColor(new Color(248, 250, 252));
                    content.addRect(margin, y - rowHeight, sumWidths(columnWidths), rowHeight);
                    content.fill();
                }
                content.setStrokingColor(new Color(214, 224, 234));
                content.addRect(margin, y - rowHeight, sumWidths(columnWidths), rowHeight);
                content.stroke();

                for (int i = 0; i < headers.size(); i++) {
                    float w = columnWidths[i];
                    content.setStrokingColor(new Color(226, 232, 240));
                    content.moveTo(x, y);
                    content.lineTo(x, y - rowHeight);
                    content.stroke();

                    List<String> lines = wrapped.get(i);
                    float textY = y - 12f;
                    for (String line : lines) {
                        content.beginText();
                        content.setNonStrokingColor(new Color(30, 41, 59));
                        content.setFont(bodyFont, 8.4f);
                        content.newLineAtOffset(x + 4f, textY);
                        content.showText(PdfTextUtil.sanitize(line));
                        content.endText();
                        textY -= textLineHeight;
                    }
                    x += w;
                }
                content.moveTo(margin + sumWidths(columnWidths), y);
                content.lineTo(margin + sumWidths(columnWidths), y - rowHeight);
                content.stroke();

                y -= rowHeight;
                rowIndex++;
            }

            if (y < 145f) {
                content.close();
                state = createPdfPage(
                        document,
                        title,
                        headers,
                        Map.of("Periode", "Validation"),
                        template,
                        false,
                        titleFont,
                        bodyFont,
                        columnWidths,
                        margin
                );
                content = state.content;
                y = state.tableTopY;
            }

            drawSignatureBlock(
                    content,
                    y,
                    margin,
                    state.page.getMediaBox().getWidth(),
                    bodyFont,
                    titleFont,
                    template
            );
            content.close();

            int totalPages = document.getNumberOfPages();
            for (int i = 0; i < totalPages; i++) {
                PDPage p = document.getPage(i);
                try (PDPageContentStream footer = new PDPageContentStream(document, p, AppendMode.APPEND, true, true)) {
                    footer.setStrokingColor(new Color(203, 213, 225));
                    footer.moveTo(margin, 34f);
                    footer.lineTo(p.getMediaBox().getWidth() - margin, 34f);
                    footer.stroke();
                    footer.beginText();
                    footer.setFont(bodyFont, 8);
                    footer.setNonStrokingColor(new Color(51, 65, 85));
                    footer.newLineAtOffset(margin, 24);
                    footer.showText(PdfTextUtil.sanitize(
                            RapportAnnuelUtil.SKA_FOOTER_LEFT + "  " + RapportAnnuelUtil.SKA_FOOTER_PHONE
                                    + "  " + RapportAnnuelUtil.SKA_FOOTER_WEB
                                    + "  ·  " + title + "  ·  Page " + (i + 1) + "/" + totalPages
                    ));
                    footer.endText();
                }
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private PdfPageState createPdfPage(
            PDDocument document,
            String title,
            List<String> headers,
            Map<String, String> meta,
            ReportTemplate template,
            boolean includeMeta,
            PDType1Font titleFont,
            PDType1Font bodyFont,
            float[] columnWidths,
            float margin
    ) throws IOException {
        float totalWidth = sumWidths(columnWidths);
        PDRectangle pageFormat = totalWidth > (PDRectangle.A4.getWidth() - 2 * margin)
                ? new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth())
                : PDRectangle.A4;
        PDPage page = new PDPage(pageFormat);
        document.addPage(page);
        PDPageContentStream content = new PDPageContentStream(document, page);
        float y = drawReportHeader(content, document, page, title, meta, template, titleFont, bodyFont, includeMeta, margin);
        float tableHeaderTop = drawTableHeader(content, headers, columnWidths, y, margin, titleFont);
        return new PdfPageState(page, content, tableHeaderTop - 2f);
    }

    private float drawReportHeader(
            PDPageContentStream content,
            PDDocument document,
            PDPage page,
            String title,
            Map<String, String> meta,
            ReportTemplate template,
            PDType1Font titleFont,
            PDType1Font bodyFont,
            boolean includeMeta,
            float margin
    ) throws IOException {
        float pageWidth = page.getMediaBox().getWidth();
        float topY = page.getMediaBox().getHeight() - 40f;

        Color primary = SKA_TEAL;
        Color accent = template == ReportTemplate.FINANCIER ? SKA_ORANGE : SKA_CYAN;

        content.setNonStrokingColor(primary);
        content.addRect(0, topY - 42f, pageWidth, 42f);
        content.fill();
        content.setNonStrokingColor(accent);
        content.addRect(0, topY - 46f, pageWidth, 4f);
        content.fill();

        float logoX = margin;
        float logoY = topY - 33f;
        boolean drawnLogo = drawLogoIfAvailable(document, content, logoX, logoY, 26f);
        if (!drawnLogo) {
            content.setNonStrokingColor(Color.WHITE);
            content.addRect(logoX, logoY, 26f, 26f);
            content.fill();
            content.beginText();
            content.setNonStrokingColor(SKA_TEAL_DARK);
            content.setFont(titleFont, 8f);
            content.newLineAtOffset(logoX + 4.5f, logoY + 9f);
            content.showText("SKA");
            content.endText();
        }

        content.beginText();
        content.setNonStrokingColor(Color.WHITE);
        content.setFont(titleFont, 12);
        content.newLineAtOffset(margin + 38f, topY - 24f);
        content.showText("SMART KIDS ACADEMY");
        content.endText();

        content.setNonStrokingColor(SKA_INK);
        float y = topY - 64f;
        content.beginText();
        content.setFont(titleFont, 15);
        content.newLineAtOffset(margin, y);
        content.showText(PdfTextUtil.sanitize(title.toUpperCase()));
        content.endText();
        y -= 15f;

        content.beginText();
        content.setFont(bodyFont, 9);
        content.setNonStrokingColor(new Color(71, 85, 105));
        content.newLineAtOffset(margin, y);
        content.showText(PdfTextUtil.sanitize(
                "Nehemiah Lab · Document généré le " + LocalDateTime.now().format(REPORT_DATE_TIME)
        ));
        content.endText();
        y -= 15f;

        if (includeMeta && meta != null && !meta.isEmpty()) {
            float metaHeight = Math.max(30f, ((meta.size() + 1) / 2) * 15f + 12f);
            content.setNonStrokingColor(new Color(241, 245, 249));
            content.addRect(margin, y - metaHeight + 6f, pageWidth - 2 * margin, metaHeight);
            content.fill();

            content.beginText();
            content.setFont(bodyFont, 9);
            content.setNonStrokingColor(new Color(51, 65, 85));
            content.newLineAtOffset(margin + 10f, y - 7f);
            int index = 0;
            float metaColumnWidth = (pageWidth - 2 * margin - 20f) / 2f;
            for (Map.Entry<String, String> entry : meta.entrySet()) {
                if (index > 0 && index % 2 == 0) {
                    content.newLineAtOffset(-metaColumnWidth, -15f);
                } else if (index % 2 == 1) {
                    content.newLineAtOffset(metaColumnWidth, 0);
                }
                String value = entry.getValue() == null || entry.getValue().isBlank() ? "-" : entry.getValue();
                content.showText(PdfTextUtil.sanitize(entry.getKey() + " : " + value));
                index++;
            }
            content.endText();
            y -= metaHeight + 2f;
        }
        return y;
    }

    private float drawTableHeader(
            PDPageContentStream content,
            List<String> headers,
            float[] widths,
            float y,
            float margin,
            PDType1Font titleFont
    ) throws IOException {
        float headerHeight = 20f;
        float tableWidth = sumWidths(widths);
        content.setNonStrokingColor(SKA_TEAL_DARK);
        content.addRect(margin, y - headerHeight, tableWidth, headerHeight);
        content.fill();
        content.setStrokingColor(new Color(15, 23, 42));
        content.addRect(margin, y - headerHeight, tableWidth, headerHeight);
        content.stroke();

        float x = margin;
        for (int i = 0; i < headers.size(); i++) {
            if (i > 0) {
                content.setStrokingColor(new Color(71, 85, 105));
                content.moveTo(x, y);
                content.lineTo(x, y - headerHeight);
                content.stroke();
            }
            content.beginText();
            content.setNonStrokingColor(Color.WHITE);
            content.setFont(titleFont, 8.6f);
            content.newLineAtOffset(x + 4f, y - 13f);
            content.showText(PdfTextUtil.sanitize(headers.get(i)));
            content.endText();
            x += widths[i];
        }
        return y - headerHeight;
    }

    private float sumWidths(float[] widths) {
        float total = 0f;
        for (float w : widths) total += w;
        return total;
    }

    private boolean drawLogoIfAvailable(PDDocument document, PDPageContentStream content, float x, float y, float size) {
        try {
            ClassPathResource resource = new ClassPathResource("branding/ska-logo.png");
            if (resource.exists()) {
                PDImageXObject logo = PDImageXObject.createFromByteArray(
                        document,
                        resource.getInputStream().readAllBytes(),
                        "ska-logo"
                );
                content.drawImage(logo, x, y, size, size);
                return true;
            }
        } catch (Exception ignored) {
            // Le monogramme vectoriel est utilisé en repli.
        }

        List<Path> candidates = List.of(
                Paths.get("frontend", "public", "assets", "images", "smart-kids-logo.png"),
                Paths.get("..", "frontend", "public", "assets", "images", "smart-kids-logo.png"),
                Paths.get("frontend", "dist", "assets", "images", "smart-kids-logo.png"),
                Paths.get("..", "frontend", "dist", "assets", "images", "smart-kids-logo.png")
        );
        for (Path candidate : candidates) {
            try {
                Path resolved = Paths.get("").toAbsolutePath().resolve(candidate).normalize();
                if (Files.exists(resolved)) {
                    PDImageXObject logo = PDImageXObject.createFromFileByContent(resolved.toFile(), document);
                    content.drawImage(logo, x, y, size, size);
                    return true;
                }
            } catch (Exception ignored) {
                // fallback: continue search
            }
        }
        return false;
    }

    private void drawSignatureBlock(
            PDPageContentStream content,
            float y,
            float margin,
            float pageWidth,
            PDType1Font bodyFont,
            PDType1Font titleFont,
            ReportTemplate template
    ) throws IOException {
        float blockTop = y - 10f;
        float blockWidth = pageWidth - (2 * margin);
        content.setNonStrokingColor(new Color(248, 250, 252));
        content.addRect(margin, blockTop - 100f, blockWidth, 100f);
        content.fill();
        content.setStrokingColor(new Color(203, 213, 225));
        content.addRect(margin, blockTop - 100f, blockWidth, 100f);
        content.stroke();
        content.setNonStrokingColor(SKA_TEAL);
        content.addRect(margin, blockTop - 3f, blockWidth, 3f);
        content.fill();

        String label = switch (template) {
            case APPRENANTS -> "Validation pédagogique du rapport apprenants";
            case HEURES -> "Validation pédagogique du rapport heures";
            case SEANCES -> "Validation pédagogique du suivi des séances";
            case ACTIVITES -> "Validation pédagogique du rapport activités";
            case FINANCIER -> "Validation financière du rapport";
        };

        content.beginText();
        content.setNonStrokingColor(SKA_INK);
        content.setFont(titleFont, 10);
        content.newLineAtOffset(margin + 10f, blockTop - 16f);
        content.showText(PdfTextUtil.sanitize(label));
        content.endText();

        content.beginText();
        content.setNonStrokingColor(new Color(71, 85, 105));
        content.setFont(bodyFont, 9);
        content.newLineAtOffset(margin + 10f, blockTop - 36f);
        content.showText(PdfTextUtil.sanitize("Directeur : __________________________"));
        content.newLineAtOffset(blockWidth / 2f, 0);
        content.showText(PdfTextUtil.sanitize("Responsable : __________________________"));
        content.newLineAtOffset(-blockWidth / 2f, -22f);
        content.showText(PdfTextUtil.sanitize("Date : ____ / ____ / ______"));
        content.newLineAtOffset(blockWidth / 2f, 0);
        content.showText(PdfTextUtil.sanitize("Cachet / Observation : __________________________"));
        content.endText();
    }

    private List<String> splitLine(String input, int maxLength) {
        List<String> lines = new ArrayList<>();
        if (input == null) {
            lines.add("-");
            return lines;
        }
        String remaining = input;
        while (remaining.length() > maxLength) {
            int splitAt = remaining.lastIndexOf(' ', maxLength);
            if (splitAt <= 0) splitAt = maxLength;
            lines.add(remaining.substring(0, splitAt));
            remaining = remaining.substring(splitAt).trim();
        }
        if (!remaining.isBlank()) lines.add(remaining);
        if (lines.isEmpty()) lines.add("-");
        return lines;
    }

    private List<Eleve> loadEleves(Long eleveId, List<Long> centreIds) {
        if (eleveId != null) {
            return eleveRepository.findById(eleveId).stream()
                    .filter(e -> e.getCentre() != null && centreIds.contains(e.getCentre().getId()))
                    .toList();
        }
        if (centreIds.isEmpty()) return List.of();
        if (centreIds.size() == 1) return eleveRepository.findByCentreId(centreIds.get(0));
        return eleveRepository.findAll().stream()
                .filter(e -> e.getCentre() != null && centreIds.contains(e.getCentre().getId()))
                .toList();
    }

    private Map<Long, String> centreNames(List<Long> centreIds) {
        if (centreIds.isEmpty()) return Map.of();
        return centreRepository.findAllById(centreIds).stream()
                .collect(Collectors.toMap(Centre::getId, Centre::getNom, (a, b) -> a));
    }

    private Map<Long, String> userNames(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Map.of();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(
                        User::getId,
                        u -> ((u.getPrenom() != null ? u.getPrenom() : "") + " " + (u.getNom() != null ? u.getNom() : "")).trim(),
                        (a, b) -> a
                ));
    }

    private List<ModuleFormation> loadFormations(User user, List<Long> centreIds, LocalDate debutDate, LocalDate finDate) {
        if (centreIds.isEmpty()) return List.of();
        if (user.getRole() == Role.FORMATEUR) {
            return moduleFormationRepository.findByFormateurIdAndCentreIdInAndDateBetween(user.getId(), centreIds, debutDate, finDate);
        }
        return moduleFormationRepository.findByCentreIdInAndDateBetween(centreIds, debutDate, finDate);
    }

    @GetMapping("/eleves")
    public ResponseEntity<byte[]> exportEleves(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) Long eleveId,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        if (eleveId != null) {
            centreAccessService.requireEleveAccess(user, eleveId);
        }
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);

        List<Eleve> eleves = loadEleves(eleveId, centreIds);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Apprenants");
        CellStyle headerStyle = buildHeaderStyle(workbook);

        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID", "Matricule", "Nom", "Prénom", "Âge", "Sexe", "Classe", "Centre", "Région", "Cluster", "Total Heures", "Projet"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (Eleve eleve : eleves) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(eleve.getId());
            row.createCell(1).setCellValue(eleve.getMatricule() != null ? eleve.getMatricule() : "-");
            row.createCell(2).setCellValue(eleve.getNom());
            row.createCell(3).setCellValue(eleve.getPrenom());
            row.createCell(4).setCellValue(eleve.getAge());
            row.createCell(5).setCellValue(eleve.getSexe());
            row.createCell(6).setCellValue(eleve.getClasse());
            row.createCell(7).setCellValue(eleve.getCentre() != null ? eleve.getCentre().getNom() : "-");
            row.createCell(8).setCellValue(eleve.getCentre() != null && eleve.getCentre().getRegion() != null ? eleve.getCentre().getRegion() : "-");
            row.createCell(9).setCellValue(eleve.getCentre() != null && eleve.getCentre().getCluster() != null ? eleve.getCentre().getCluster() : "-");
            row.createCell(10).setCellValue(eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0);
            row.createCell(11).setCellValue(eleve.getProjet() != null ? eleve.getProjet().getNom() : "Aucun");
        }

        addLogoToSheet(workbook, sheet, columns.length - 1);
        finalizeExcelSheet(sheet, columns.length, "Liste des apprenants");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=eleves.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/eleve/{id}")
    public ResponseEntity<byte[]> exportSingleEleve(@PathVariable Long id, Authentication auth) throws IOException {
        return exportEleves(null, null, null, id, auth);
    }

    @GetMapping("/eleves/pdf")
    public ResponseEntity<byte[]> exportElevesPdf(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) Long eleveId,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        if (eleveId != null) {
            centreAccessService.requireEleveAccess(user, eleveId);
        }
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        List<Eleve> eleves = loadEleves(eleveId, centreIds);

        List<List<String>> rows = eleves.stream().map(e -> List.of(
                e.getMatricule() != null ? e.getMatricule() : "-",
                e.getNom() != null ? e.getNom() : "-",
                e.getPrenom() != null ? e.getPrenom() : "-",
                String.valueOf(e.getAge()),
                e.getSexe() != null ? e.getSexe() : "-",
                e.getClasse() != null ? e.getClasse() : "-",
                e.getCentre() != null ? e.getCentre().getNom() : "-",
                e.getTotalHeures() != null ? String.format("%.1f h", e.getTotalHeures()) : "0.0 h",
                e.getProjet() != null ? e.getProjet().getNom() : "Aucun"
        )).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Période", "Toutes dates");
        meta.put("Region", region == null ? "-" : region);
        meta.put("Cluster", cluster == null ? "-" : cluster);
        meta.put("Total apprenants", String.valueOf(rows.size()));

        byte[] pdf = buildPdfTableReport(
                "Rapport apprenants",
                List.of("Matricule", "Nom", "Prénom", "Age", "Sexe", "Classe", "Centre", "Heures", "Projet"),
                rows,
                meta,
                ReportTemplate.APPRENANTS,
                new float[]{55f, 70f, 70f, 30f, 30f, 50f, 90f, 50f, 80f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rapport_apprenants.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private static final Map<Role, String> ROLE_LABELS_FR = Map.ofEntries(
            Map.entry(Role.DIRECTEUR, "Directeur"),
            Map.entry(Role.FORMATEUR, "Formateur"),
            Map.entry(Role.COORDINATEUR, "Coordinateur"),
            Map.entry(Role.RESPONSABLE_CLUSTER, "Responsable cluster"),
            Map.entry(Role.COMPTABLE, "Comptable"),
            Map.entry(Role.STAFF_NEHEMIAH, "Staff Nehemiah"),
            Map.entry(Role.ANIMATEUR, "Animateur CDEJ"),
            Map.entry(Role.PARENT, "Parent"),
            Map.entry(Role.BENEVOLE, "Benevole CDEJ"),
            Map.entry(Role.PARTICIPANT, "Participant CDEJ")
    );

    private String centresLabel(User u) {
        if (u.getCentres() == null || u.getCentres().isEmpty()) return "-";
        return u.getCentres().stream()
                .map(c -> c.getCodeCdej() != null && !c.getCodeCdej().isBlank()
                        ? c.getNom() + " (" + c.getCodeCdej() + ")"
                        : c.getNom())
                .sorted()
                .collect(Collectors.joining(", "));
    }

    private String ancienneteLabel(User u) {
        LocalDate ref = u.getDateEntree() != null
                ? u.getDateEntree()
                : (u.getCreatedAt() != null ? u.getCreatedAt().toLocalDate() : null);
        return ref != null ? ref.format(REPORT_DATE) : "-";
    }

    private String cniLabel(User u) {
        boolean recto = u.getCarteIdentiteRecto() != null && !u.getCarteIdentiteRecto().isBlank();
        boolean verso = u.getCarteIdentiteVerso() != null && !u.getCarteIdentiteVerso().isBlank();
        if (recto && verso) return "Complete";
        if (recto || verso) return "Partielle";
        return "Manquante";
    }

    private String dateNaissanceLabel(User u) {
        return u.getDateNaissance() != null ? u.getDateNaissance().format(REPORT_DATE) : "-";
    }

    private String lieuNaissanceLabel(User u) {
        return u.getLieuNaissance() != null && !u.getLieuNaissance().isBlank() ? u.getLieuNaissance() : "-";
    }

    private String adresseLabel(User u) {
        return u.getAdresse() != null && !u.getAdresse().isBlank() ? u.getAdresse() : "-";
    }

    @GetMapping("/formateurs")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportFormateurs() throws IOException {
        List<User> formateurs = userRepository.findByRoleOrderByCreatedAtDesc(Role.FORMATEUR);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Formateurs");
        CellStyle headerStyle = buildHeaderStyle(workbook);

        Row headerRow = sheet.createRow(0);
        String[] columns = {"Nom", "Prenom", "Email", "Telephone", "Date de naissance", "Lieu de naissance", "Adresse", "Statut", "Centre(s)", "Date d'entree", "CNI"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (User f : formateurs) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(f.getNom());
            row.createCell(1).setCellValue(f.getPrenom());
            row.createCell(2).setCellValue(f.getEmail());
            row.createCell(3).setCellValue(f.getTelephone() != null ? f.getTelephone() : "-");
            row.createCell(4).setCellValue(dateNaissanceLabel(f));
            row.createCell(5).setCellValue(lieuNaissanceLabel(f));
            row.createCell(6).setCellValue(adresseLabel(f));
            row.createCell(7).setCellValue(f.isActif() ? "Valide" : "En attente");
            row.createCell(8).setCellValue(centresLabel(f));
            row.createCell(9).setCellValue(ancienneteLabel(f));
            row.createCell(10).setCellValue(cniLabel(f));
        }

        addLogoToSheet(workbook, sheet, columns.length - 1);
        finalizeExcelSheet(sheet, columns.length, "Liste des formateurs");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=formateurs.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/formateurs/pdf")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportFormateursPdf() throws IOException {
        List<User> formateurs = userRepository.findByRoleOrderByCreatedAtDesc(Role.FORMATEUR);

        List<List<String>> rows = formateurs.stream().map(f -> List.of(
                f.getNom() != null ? f.getNom() : "-",
                f.getPrenom() != null ? f.getPrenom() : "-",
                f.getEmail(),
                f.getTelephone() != null ? f.getTelephone() : "-",
                dateNaissanceLabel(f),
                lieuNaissanceLabel(f),
                adresseLabel(f),
                f.isActif() ? "Valide" : "En attente",
                centresLabel(f),
                ancienneteLabel(f),
                cniLabel(f)
        )).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Total formateurs", String.valueOf(rows.size()));
        long valides = formateurs.stream().filter(User::isActif).count();
        meta.put("Valides", String.valueOf(valides));
        meta.put("En attente", String.valueOf(rows.size() - valides));

        byte[] pdf = buildPdfTableReport(
                "Liste des formateurs",
                List.of("Nom", "Prénom", "Email", "Telephone", "Naissance", "Lieu naiss.", "Adresse", "Statut", "Centre(s)", "Entree", "CNI"),
                rows,
                meta,
                ReportTemplate.ACTIVITES,
                new float[]{55f, 55f, 90f, 55f, 50f, 60f, 75f, 40f, 85f, 42f, 48f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=formateurs.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/utilisateurs")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportUtilisateurs() throws IOException {
        List<User> utilisateurs = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.PARENT)
                .sorted(Comparator.comparing(User::getNom, Comparator.nullsLast(String::compareTo)))
                .toList();

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Utilisateurs");
        CellStyle headerStyle = buildHeaderStyle(workbook);

        Row headerRow = sheet.createRow(0);
        String[] columns = {"Nom", "Prenom", "Email", "Role", "Telephone", "Statut", "Centre(s)", "Date d'entree"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (User u : utilisateurs) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(u.getNom());
            row.createCell(1).setCellValue(u.getPrenom());
            row.createCell(2).setCellValue(u.getEmail());
            row.createCell(3).setCellValue(ROLE_LABELS_FR.getOrDefault(u.getRole(), u.getRole().name()));
            row.createCell(4).setCellValue(u.getTelephone() != null ? u.getTelephone() : "-");
            row.createCell(5).setCellValue(u.isActif() ? "Actif" : "Inactif");
            row.createCell(6).setCellValue(centresLabel(u));
            row.createCell(7).setCellValue(ancienneteLabel(u));
        }

        addLogoToSheet(workbook, sheet, columns.length - 1);
        finalizeExcelSheet(sheet, columns.length, "Liste des utilisateurs");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=utilisateurs.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/utilisateurs/pdf")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportUtilisateursPdf() throws IOException {
        List<User> utilisateurs = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.PARENT)
                .sorted(Comparator.comparing(User::getNom, Comparator.nullsLast(String::compareTo)))
                .toList();

        List<List<String>> rows = utilisateurs.stream().map(u -> List.of(
                u.getNom() != null ? u.getNom() : "-",
                u.getPrenom() != null ? u.getPrenom() : "-",
                u.getEmail(),
                ROLE_LABELS_FR.getOrDefault(u.getRole(), u.getRole().name()),
                u.getTelephone() != null ? u.getTelephone() : "-",
                u.isActif() ? "Actif" : "Inactif",
                centresLabel(u),
                ancienneteLabel(u)
        )).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Total utilisateurs", String.valueOf(rows.size()));

        byte[] pdf = buildPdfTableReport(
                "Liste des utilisateurs",
                List.of("Nom", "Prénom", "Email", "Role", "Telephone", "Statut", "Centre(s)", "Entree"),
                rows,
                meta,
                ReportTemplate.ACTIVITES,
                new float[]{60f, 60f, 95f, 65f, 50f, 42f, 80f, 50f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=utilisateurs.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/eleve/{id}/pdf")
    public ResponseEntity<byte[]> exportSingleElevePdf(@PathVariable Long id, Authentication auth) throws IOException {
        return exportEleveFichePdf(id, auth);
    }

    /**
     * Fiche pédagogique narrative d'un enfant : identité, projet, causes,
     * justifications, séances, absences et observations.
     */
    @GetMapping("/eleve/{id}/fiche-pdf")
    public ResponseEntity<byte[]> exportEleveFichePdf(@PathVariable Long id, Authentication auth) throws IOException {
        User user = (User) auth.getPrincipal();
        Eleve eleve = eleveRepository.findById(id).orElse(null);
        if (eleve == null) return ResponseEntity.notFound().build();

        List<Long> allowed = allowedCentreIds(user);
        if (eleve.getCentre() == null || !allowed.contains(eleve.getCentre().getId())) {
            return ResponseEntity.status(403).build();
        }

        List<EvaluationSession> evals = evaluationSessionRepository.findByEleveId(id).stream()
                .sorted(Comparator.comparing((EvaluationSession e) ->
                        e.getSessionCours() != null && e.getSessionCours().getHeureDebut() != null
                                ? e.getSessionCours().getHeureDebut()
                                : LocalDateTime.MIN).reversed())
                .toList();
        List<Commentaire> commentaires = commentaireRepository.findByEleveIdOrderByCreatedAtDesc(id);
        List<Signalement> signalements = signalementRepository.findByEleveIdOrderByCreatedAtDesc(id);

        long totalSeances = evals.size();
        long presentes = evals.stream().filter(EvaluationSession::isPresent).count();
        long absences = totalSeances - presentes;
        double avgNote = evals.stream()
                .filter(e -> e.getNote() != null)
                .mapToDouble(EvaluationSession::getNote)
                .average()
                .orElse(0);

        Projet projet = eleve.getProjet();
        String projetNom = projet != null && projet.getNom() != null ? projet.getNom() : "Aucun projet formalise";
        int evolution = projet != null && projet.getEvolution() != null ? projet.getEvolution() : 0;

        String cause = projet != null && projet.getCauseNonAvancement() != null && !projet.getCauseNonAvancement().isBlank()
                ? projet.getCauseNonAvancement()
                : (evolution < 100
                ? "Aucune cause detaillee n'a encore ete saisie. Le formateur doit preciser pourquoi le projet n'est pas abouti (absences, difficulte technique, manque de temps, demotivation, materiel, etc.)."
                : "Le projet est considere comme termine.");

        String justification = projet != null && projet.getJustificationPedagogique() != null && !projet.getJustificationPedagogique().isBlank()
                ? projet.getJustificationPedagogique()
                : "Cette fiche justifie le parcours de l'enfant : assiduite, qualite du projet, obstacles rencontres et accompagnement mis en place. "
                + "Elle sert de trace officielle pour le Directeur, les partenaires et le suivi pedagogique SKA.";

        String pointsForts = projet != null && projet.getPointsForts() != null && !projet.getPointsForts().isBlank()
                ? projet.getPointsForts()
                : "A completer : curiosite, collaboration, creativite, perseverance, maitrise technique, etc.";

        String recommandations = projet != null && projet.getRecommandations() != null && !projet.getRecommandations().isBlank()
                ? projet.getRecommandations()
                : "A completer : seances de rattrapage, tutorat pair, simplification du projet, renforcement Soft Skills, suivi parental, etc.";

        String intro = "Smart Kids Academy accompagne chaque enfant dans un parcours entrepreneurial et creatif. "
                + "Ce rapport individuel explique la situation reelle de "
                + eleve.getPrenom() + " " + eleve.getNom()
                + " : presence en seance, avancement du projet, causes des retards et recommandations concretes.";

        String bilanPresence = presentes + " presence(s) sur " + totalSeances + " seance(s) evaluee(s)"
                + (totalSeances > 0 ? " (" + Math.round(100.0 * presentes / totalSeances) + "%)." : ".")
                + (absences > 0
                ? " Les absences (" + absences + ") peuvent expliquer un projet incomplet ou une participation irreguliere."
                : " L'assiduite est satisfaisante.");

        String bilanProjet = evolution >= 100
                ? "Le projet \"" + projetNom + "\" est termine (" + evolution + "%). Felicitations a l'enfant pour ce parcours abouti."
                : evolution >= 60
                ? "Le projet \"" + projetNom + "\" est en bonne voie (" + evolution + "%), mais n'est pas encore finalise. Les causes et recommandations ci-dessous preciseront les freins restants."
                : evolution > 0
                ? "Le projet \"" + projetNom + "\" reste peu avance (" + evolution + "%). Ce rapport documente les raisons et les actions a mener."
                : "Aucun avancement significatif n'est encore enregistre pour le projet. Une justification pedagogique est indispensable.";

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 42f;
            Color ink = new Color(30, 41, 59);
            Color muted = new Color(71, 85, 105);

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);

            Map<String, String> meta = new LinkedHashMap<>();
            meta.put("Enfant", eleve.getPrenom() + " " + eleve.getNom());
            meta.put("Centre", eleve.getCentre() != null ? eleve.getCentre().getNom() : "-");
            meta.put("Classe", eleve.getClasse() != null ? eleve.getClasse() : "-");
            meta.put("Matricule", eleve.getMatricule() != null ? eleve.getMatricule() : "-");

            float y = drawReportHeader(content, document, page, "Fiche pedagogique individuelle", meta,
                    ReportTemplate.APPRENANTS, titleFont, bodyFont, true, margin);
            float maxW = page.getMediaBox().getWidth() - 2 * margin;

            y = drawSectionTitle(content, "1. Introduction", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, intro, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "2. Identite & parcours", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content,
                    "Age: " + eleve.getAge() + " ans | Sexe: " + (eleve.getSexe() != null ? eleve.getSexe() : "-")
                            + " | Heures cumulees: " + (eleve.getTotalHeures() != null ? String.format("%.1f", eleve.getTotalHeures()) : "0")
                            + " h | Note moyenne ( /20 ): " + String.format("%.1f", avgNote),
                    bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "3. Assiduite en seance", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, bilanPresence, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "4. Projet de l'enfant", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content,
                    "Projet: " + projetNom + "\nDescription: "
                            + (projet != null && projet.getDescription() != null ? projet.getDescription() : "Non renseignee")
                            + "\n" + bilanProjet,
                    bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            if (y < 160f) {
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                y = drawReportHeader(content, document, page, "Fiche pedagogique (suite)", meta,
                        ReportTemplate.APPRENANTS, titleFont, bodyFont, false, margin);
            }

            y = drawSectionTitle(content, "5. Pourquoi le projet n'est pas abouti", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, cause, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "6. Justification pedagogique", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, justification, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "7. Points forts observes", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, pointsForts, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            y = drawSectionTitle(content, "8. Recommandations", titleFont, margin, y, ink);
            y = PdfTextUtil.drawWrapped(content, recommandations, bodyFont, 9.5f, margin, y, maxW, 13f, muted) - 8f;

            if (!commentaires.isEmpty()) {
                if (y < 140f) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = drawReportHeader(content, document, page, "Observations formateurs", meta,
                            ReportTemplate.APPRENANTS, titleFont, bodyFont, false, margin);
                }
                y = drawSectionTitle(content, "9. Observations des formateurs", titleFont, margin, y, ink);
                int n = 0;
                for (Commentaire c : commentaires) {
                    if (n >= 5) break;
                    String who = c.getAuteur() != null
                            ? (c.getAuteur().getPrenom() + " " + c.getAuteur().getNom())
                            : "Formateur";
                    y = PdfTextUtil.drawWrapped(content,
                            "- " + who + " : " + (c.getContenu() != null ? c.getContenu() : ""),
                            bodyFont, 9f, margin, y, maxW, 12f, muted) - 4f;
                    n++;
                }
            }

            if (!signalements.isEmpty()) {
                y = drawSectionTitle(content, "10. Signalements", titleFont, margin, y, ink);
                int n = 0;
                for (Signalement s : signalements) {
                    if (n >= 3) break;
                    y = PdfTextUtil.drawWrapped(content,
                            "- [" + (s.getPriorite() != null ? s.getPriorite() : "NORMALE") + "] "
                                    + (s.getDescription() != null ? s.getDescription() : ""),
                            bodyFont, 9f, margin, y, maxW, 12f, muted) - 4f;
                    n++;
                }
            }

            if (!evals.isEmpty()) {
                if (y < 160f) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = drawReportHeader(content, document, page, "Historique des seances", meta,
                            ReportTemplate.APPRENANTS, titleFont, bodyFont, false, margin);
                }
                y = drawSectionTitle(content, "Historique recent des seances", titleFont, margin, y, ink);
                int n = 0;
                for (EvaluationSession ev : evals) {
                    if (n >= 8) break;
                    SessionCours sc = ev.getSessionCours();
                    String date = sc != null && sc.getHeureDebut() != null
                            ? sc.getHeureDebut().toLocalDate().format(REPORT_DATE)
                            : "-";
                    String titre = sc != null && sc.getTitre() != null ? sc.getTitre() : "Seance";
                    String part = ev.getNote() != null
                            ? String.format("%.1f/10", ev.getNote() > 10 ? ev.getNote() / 2.0 : ev.getNote())
                            : "-";
                    String heuresEnfant = "-";
                    if (ev.isPresent()) {
                        if (ev.getDureeMinutes() != null) {
                            heuresEnfant = String.format("%.1fh", ev.getDureeMinutes() / 60.0);
                        } else if (ev.getHeureArrivee() != null && sc != null && sc.getHeureFin() != null) {
                            long m = java.time.Duration.between(ev.getHeureArrivee(), sc.getHeureFin()).toMinutes();
                            heuresEnfant = String.format("%.1fh", Math.max(0, m) / 60.0);
                        }
                    }
                    String arrivee = ev.getHeureArrivee() != null
                            ? ev.getHeureArrivee().toLocalTime().withSecond(0).withNano(0).toString()
                            : "-";
                    String seanceDuree = sc != null && sc.getDureeReelleMinutes() != null
                            ? String.format("%.1fh", sc.getDureeReelleMinutes() / 60.0)
                            : "-";
                    y = PdfTextUtil.drawWrapped(content,
                            date + " | " + titre
                                    + " | " + (ev.isPresent() ? "PRESENT" : "ABSENT")
                                    + " | Arrivee: " + arrivee
                                    + " | Heures enfant: " + heuresEnfant
                                    + " | Seance: " + seanceDuree
                                    + " | Note: " + part
                                    + (ev.getCommentaire() != null && !ev.getCommentaire().isBlank()
                                    ? " | Comm: " + ev.getCommentaire() : "")
                                    + (ev.getProjetTravaille() != null && !ev.getProjetTravaille().isBlank()
                                    ? " | Projet: " + ev.getProjetTravaille() : ""),
                            bodyFont, 8.5f, margin, y, maxW, 11.5f, muted) - 2f;
                    n++;
                    if (y < 70f) break;
                }
            }

            y -= 10f;
            y = PdfTextUtil.drawWrapped(content,
                    "Conclusion: ce document illustre le parcours reel de l'enfant. Toute absence de projet abouti doit etre justifiee "
                            + "(cause, contexte, accompagnement). Les donnees de presence et les observations forment la preuve pedagogique SKA.",
                    bodyFont, 9.5f, margin, y, maxW, 13f, ink);

            drawSignatureBlock(
                    content,
                    Math.max(y - 20f, 90f),
                    margin,
                    page.getMediaBox().getWidth(),
                    bodyFont,
                    titleFont,
                    ReportTemplate.APPRENANTS
            );
            content.close();

            int totalPages = document.getNumberOfPages();
            for (int i = 0; i < totalPages; i++) {
                PDPage p = document.getPage(i);
                try (PDPageContentStream footer = new PDPageContentStream(document, p, AppendMode.APPEND, true, true)) {
                    footer.setStrokingColor(new Color(203, 213, 225));
                    footer.moveTo(margin, 34f);
                    footer.lineTo(p.getMediaBox().getWidth() - margin, 34f);
                    footer.stroke();
                    footer.beginText();
                    footer.setFont(bodyFont, 8);
                    footer.setNonStrokingColor(new Color(51, 65, 85));
                    footer.newLineAtOffset(margin, 24);
                    footer.showText(PdfTextUtil.sanitize(
                            RapportAnnuelUtil.SKA_FOOTER_LEFT + "  " + RapportAnnuelUtil.SKA_FOOTER_PHONE
                                    + "  " + RapportAnnuelUtil.SKA_FOOTER_WEB
                                    + "  ·  Fiche enfant  ·  Page " + (i + 1) + "/" + totalPages
                    ));
                    footer.endText();
                }
            }

            document.save(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fiche_enfant_" + id + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(out.toByteArray());
        }
    }

    private float drawSectionTitle(
            PDPageContentStream content,
            String title,
            PDType1Font titleFont,
            float x,
            float y,
            Color color
    ) throws IOException {
        content.beginText();
        content.setNonStrokingColor(color);
        content.setFont(titleFont, 11);
        content.newLineAtOffset(x, y);
        content.showText(PdfTextUtil.sanitize(title));
        content.endText();
        return y - 16f;
    }

    @GetMapping("/heures")
    public ResponseEntity<byte[]> exportHeures(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);

        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));

        List<Eleve> eleves = loadEleves(null, centreIds);
        List<ModuleFormation> formations = loadFormations(user, centreIds, debutDate, finDate);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Présences et Heures");
        CellStyle headerStyle = buildHeaderStyle(workbook);

        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID Élève", "Nom", "Prénom", "Centre", "Heures cumulées", "Sessions période", "Date début formation"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (Eleve eleve : eleves) {
            long sessionsPeriode = formations.stream()
                    .filter(f -> f.getElevesPresents() != null && f.getElevesPresents().contains(eleve.getId()))
                    .count();
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(eleve.getId());
            row.createCell(1).setCellValue(eleve.getNom());
            row.createCell(2).setCellValue(eleve.getPrenom());
            row.createCell(3).setCellValue(eleve.getCentre() != null ? eleve.getCentre().getNom() : "-");
            row.createCell(4).setCellValue(eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0);
            row.createCell(5).setCellValue(sessionsPeriode);
            row.createCell(6).setCellValue(eleve.getDateDebutFormation() != null ? eleve.getDateDebutFormation().toString() : "-");
        }

        finalizeExcelSheet(sheet, columns.length, "Liste des présences et heures");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=heures.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/activites")
    public ResponseEntity<byte[]> exportActivites(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));

        List<ModuleFormation> formations = loadFormations(user, centreIds, debutDate, finDate);
        Map<Long, String> centres = centreNames(centreIds);
        Set<Long> formateurIds = formations.stream()
                .map(ModuleFormation::getFormateurId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, String> formateurs = userNames(formateurIds);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Activites");
        CellStyle headerStyle = buildHeaderStyle(workbook);
        Row headerRow = sheet.createRow(0);
        String[] columns = {"Date", "Centre", "Formateur", "Titre", "Durée (h)", "Élèves présents"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        for (ModuleFormation f : formations) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(f.getDate() != null ? f.getDate().format(REPORT_DATE) : "-");
            row.createCell(1).setCellValue(centres.getOrDefault(f.getCentreId(), f.getCentreId() != null ? String.valueOf(f.getCentreId()) : "-"));
            row.createCell(2).setCellValue(formateurs.getOrDefault(f.getFormateurId(), f.getFormateurId() != null ? String.valueOf(f.getFormateurId()) : "-"));
            row.createCell(3).setCellValue(f.getTitre());
            row.createCell(4).setCellValue(f.getDureeHeures() != null ? f.getDureeHeures() : 0.0);
            row.createCell(5).setCellValue(f.getElevesPresents() != null ? f.getElevesPresents().size() : 0);
        }
        finalizeExcelSheet(sheet, columns.length, "Liste des activités");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=activites.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/seances")
    public ResponseEntity<byte[]> exportSeancesExcel(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));

        List<SessionCours> sessions;
        if (user.getRole() == Role.FORMATEUR) {
            sessions = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId()).stream()
                    .filter(s -> s.getCentre() != null && centreIds.contains(s.getCentre().getId()))
                    .toList();
        } else {
            sessions = sessionCoursRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(s -> s.getCentre() != null && centreIds.contains(s.getCentre().getId()))
                    .toList();
        }

        sessions = sessions.stream().filter(s -> {
            LocalDate date = s.getHeureDebut() != null ? s.getHeureDebut().toLocalDate() : null;
            return date != null && !date.isBefore(debutDate) && !date.isAfter(finDate);
        }).toList();
        List<Signalement> centreAlerts = signalementRepository.findByCentreIdInOrderByCreatedAtDesc(centreIds);
        Set<Long> urgentCentreIds = centreAlerts.stream()
                .filter(a -> "CENTRE".equalsIgnoreCase(a.getCibleType()))
                .filter(a -> "EN_ATTENTE".equalsIgnoreCase(a.getStatut()))
                .filter(a -> "URGENTE".equalsIgnoreCase(a.getPriorite()))
                .map(Signalement::getCentreId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<Long, Long> pendingAlertsByCentre = centreAlerts.stream()
                .filter(a -> "CENTRE".equalsIgnoreCase(a.getCibleType()))
                .filter(a -> "EN_ATTENTE".equalsIgnoreCase(a.getStatut()))
                .filter(a -> a.getCentreId() != null)
                .collect(Collectors.groupingBy(Signalement::getCentreId, Collectors.counting()));

        Map<Long, Long> urgentAlertsByCentre = centreAlerts.stream()
                .filter(a -> "CENTRE".equalsIgnoreCase(a.getCibleType()))
                .filter(a -> "EN_ATTENTE".equalsIgnoreCase(a.getStatut()))
                .filter(a -> "URGENTE".equalsIgnoreCase(a.getPriorite()))
                .filter(a -> a.getCentreId() != null)
                .collect(Collectors.groupingBy(Signalement::getCentreId, Collectors.counting()));

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Suivi seances");
        CellStyle headerStyle = buildHeaderStyle(workbook);

        Font summaryHeaderFont = workbook.createFont();
        summaryHeaderFont.setBold(true);
        summaryHeaderFont.setColor(IndexedColors.WHITE.getIndex());
        CellStyle summaryHeaderStyle = workbook.createCellStyle();
        summaryHeaderStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        summaryHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        summaryHeaderStyle.setFont(summaryHeaderFont);

        CellStyle urgentRowStyle = workbook.createCellStyle();
        urgentRowStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
        urgentRowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        CellStyle normalRowStyle = workbook.createCellStyle();
        normalRowStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        normalRowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle riskRedStyle = workbook.createCellStyle();
        riskRedStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
        riskRedStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        CellStyle riskOrangeStyle = workbook.createCellStyle();
        riskOrangeStyle.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
        riskOrangeStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        CellStyle riskGreenStyle = workbook.createCellStyle();
        riskGreenStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        riskGreenStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        String[] columns = {
                "NOM", "PRENOMS", "SEXE", "CLASSE", "AGE",
                "DATE", "MODULE", "PRESENCE", "ARRIVEE", "HEURES ENFANT", "PARTICIPATION /10",
                "ETAT DES EQUIPEMENTS", "DEFIS", "ALERTE URGENTE CENTRE"
        };

        Row header = sheet.createRow(0);
        for (int i = 0; i < columns.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        class CentreMetrics {
            String centreNom = "-";
            long sessions = 0;
            long lignesEleves = 0;
            double totalParticipation10 = 0.0;
            long alertesUrgentesCentre = 0;
            long alertesEnAttenteCentre = 0;
            long sessionsAvecEquipements = 0;
            long sessionsAvecDefis = 0;
            int scoreRisque = 0;
            String niveauRisque = "VERT";
        }

        Map<Long, CentreMetrics> metricsByCentre = new HashMap<>();
        int rowNum = 1;
        for (SessionCours session : sessions) {
            Long currentCentreId = session.getCentre() != null ? session.getCentre().getId() : null;
            CentreMetrics metrics = metricsByCentre.computeIfAbsent(currentCentreId == null ? -1L : currentCentreId, id -> new CentreMetrics());
            metrics.centreNom = session.getCentre() != null ? session.getCentre().getNom() : "-";
            metrics.sessions++;
            if (session.getEtatEquipements() != null && !session.getEtatEquipements().isBlank()) metrics.sessionsAvecEquipements++;
            if (session.getDefisSession() != null && !session.getDefisSession().isBlank()) metrics.sessionsAvecDefis++;
            if (currentCentreId != null) {
                metrics.alertesUrgentesCentre = urgentAlertsByCentre.getOrDefault(currentCentreId, 0L);
                metrics.alertesEnAttenteCentre = pendingAlertsByCentre.getOrDefault(currentCentreId, 0L);
            }

            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(session.getId());
            for (EvaluationSession ev : evals) {
                if (ev.getEleve() == null) continue;
                Row row = sheet.createRow(rowNum++);
                boolean urgent = currentCentreId != null && urgentCentreIds.contains(currentCentreId);

                Cell c0 = row.createCell(0); c0.setCellValue(ev.getEleve().getNom() != null ? ev.getEleve().getNom() : "-");
                Cell c1 = row.createCell(1); c1.setCellValue(ev.getEleve().getPrenom() != null ? ev.getEleve().getPrenom() : "-");
                Cell c2 = row.createCell(2); c2.setCellValue(ev.getEleve().getSexe() != null ? ev.getEleve().getSexe() : "-");
                Cell c3 = row.createCell(3); c3.setCellValue(ev.getEleve().getClasse() != null ? ev.getEleve().getClasse() : "-");
                Cell c4 = row.createCell(4); c4.setCellValue(ev.getEleve().getAge() != null ? ev.getEleve().getAge() : 0);
                Cell c5 = row.createCell(5); c5.setCellValue(session.getHeureDebut() != null ? session.getHeureDebut().toString() : "-");
                Cell c6 = row.createCell(6); c6.setCellValue(session.getModuleFait() != null ? session.getModuleFait()
                        : (session.getTitre() != null ? session.getTitre() : "-"));
                Cell c7 = row.createCell(7); c7.setCellValue(ev.isPresent() ? "PRESENT" : "ABSENT");
                Cell c8 = row.createCell(8); c8.setCellValue(ev.getHeureArrivee() != null
                        ? ev.getHeureArrivee().toLocalTime().withSecond(0).withNano(0).toString() : "-");
                double heuresEnfant = ev.getDureeMinutes() != null ? ev.getDureeMinutes() / 60.0 : 0.0;
                Cell c9 = row.createCell(9); c9.setCellValue(Math.round(heuresEnfant * 10.0) / 10.0);
                double rawNote = ev.getNote() != null ? ev.getNote() : 0.0;
                double participation10 = rawNote > 10 ? Math.round((rawNote / 2.0) * 10.0) / 10.0 : Math.round(rawNote * 10.0) / 10.0;
                Cell c10 = row.createCell(10); c10.setCellValue(participation10);
                Cell c11 = row.createCell(11); c11.setCellValue(session.getEtatEquipements() != null ? session.getEtatEquipements() : "-");
                Cell c12 = row.createCell(12); c12.setCellValue(session.getDefisSession() != null ? session.getDefisSession() : "-");
                Cell c13 = row.createCell(13); c13.setCellValue(urgent ? "OUI" : "NON");

                CellStyle applied = urgent ? urgentRowStyle : normalRowStyle;
                for (int i = 0; i <= 13; i++) row.getCell(i).setCellStyle(applied);

                metrics.lignesEleves++;
                metrics.totalParticipation10 += participation10;
            }
        }

        finalizeExcelSheet(sheet, columns.length, "Liste des séances");

        for (Map.Entry<Long, CentreMetrics> entry : metricsByCentre.entrySet()) {
            CentreMetrics m = entry.getValue();
            double participationMoy = m.lignesEleves > 0 ? (m.totalParticipation10 / m.lignesEleves) : 10.0;
            int score = 0;
            score += (int) (m.alertesUrgentesCentre * 40);
            score += (int) (Math.min(m.alertesEnAttenteCentre, 5) * 8);
            if (participationMoy < 4.0) score += 25;
            else if (participationMoy < 6.0) score += 15;
            else if (participationMoy < 7.5) score += 8;
            if (m.sessions > 0) {
                double ratioDefis = (double) m.sessionsAvecDefis / m.sessions;
                if (ratioDefis >= 0.6) score += 15;
                else if (ratioDefis >= 0.3) score += 8;
                double ratioEquip = (double) m.sessionsAvecEquipements / m.sessions;
                if (ratioEquip < 0.3) score += 10;
                else if (ratioEquip < 0.6) score += 5;
            }
            if (score > 100) score = 100;
            m.scoreRisque = score;
            if (score >= 60) m.niveauRisque = "ROUGE";
            else if (score >= 30) m.niveauRisque = "ORANGE";
            else m.niveauRisque = "VERT";
        }

        Sheet summary = workbook.createSheet("Resume indicateurs centre");
        String[] summaryCols = {
                "RANG", "CENTRE", "SCORE RISQUE", "NIVEAU", "SEANCES", "LIGNES ELEVES",
                "PARTICIPATION MOY /10", "ALERTES EN ATTENTE", "ALERTES URGENTES",
                "SEANCES AVEC ETAT EQUIPEMENTS", "SEANCES AVEC DEFIS"
        };
        Row summaryHeader = summary.createRow(0);
        for (int i = 0; i < summaryCols.length; i++) {
            Cell cell = summaryHeader.createCell(i);
            cell.setCellValue(summaryCols[i]);
            cell.setCellStyle(summaryHeaderStyle);
        }

        List<Map.Entry<Long, CentreMetrics>> metricsEntries = metricsByCentre.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<Long, CentreMetrics>>comparingInt(e -> e.getValue().scoreRisque).reversed()
                        .thenComparing(e -> e.getValue().centreNom))
                .toList();
        int summaryRowNum = 1;
        int rang = 1;
        for (Map.Entry<Long, CentreMetrics> entry : metricsEntries) {
            CentreMetrics m = entry.getValue();
            Row r = summary.createRow(summaryRowNum++);
            r.createCell(0).setCellValue(rang++);
            r.createCell(1).setCellValue(m.centreNom);
            r.createCell(2).setCellValue(m.scoreRisque);
            r.createCell(3).setCellValue(m.niveauRisque);
            r.createCell(4).setCellValue(m.sessions);
            r.createCell(5).setCellValue(m.lignesEleves);
            r.createCell(6).setCellValue(m.lignesEleves > 0 ? Math.round((m.totalParticipation10 / m.lignesEleves) * 10.0) / 10.0 : 0.0);
            r.createCell(7).setCellValue(m.alertesEnAttenteCentre);
            r.createCell(8).setCellValue(m.alertesUrgentesCentre);
            r.createCell(9).setCellValue(m.sessionsAvecEquipements);
            r.createCell(10).setCellValue(m.sessionsAvecDefis);

            CellStyle riskStyle = switch (m.niveauRisque) {
                case "ROUGE" -> riskRedStyle;
                case "ORANGE" -> riskOrangeStyle;
                default -> riskGreenStyle;
            };
            for (int i = 0; i <= 10; i++) {
                if (r.getCell(i) != null) r.getCell(i).setCellStyle(riskStyle);
            }
        }

        finalizeExcelSheet(summary, summaryCols.length, "Résumé des indicateurs par centre");
        summary.createFreezePane(0, 1);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=suivi_seances.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/heures/pdf")
    public ResponseEntity<byte[]> exportHeuresPdf(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));

        List<Eleve> eleves = loadEleves(null, centreIds);
        List<ModuleFormation> formations = loadFormations(user, centreIds, debutDate, finDate);

        List<List<String>> rows = eleves.stream().map(eleve -> {
            long sessionsPeriode = formations.stream()
                    .filter(f -> f.getElevesPresents() != null && f.getElevesPresents().contains(eleve.getId()))
                    .count();
            return List.of(
                    eleve.getNom() != null ? eleve.getNom() : "-",
                    eleve.getPrenom() != null ? eleve.getPrenom() : "-",
                    eleve.getCentre() != null ? eleve.getCentre().getNom() : "-",
                    String.format("%.1f", eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0),
                    String.valueOf(sessionsPeriode),
                    eleve.getDateDebutFormation() != null ? eleve.getDateDebutFormation().toString() : "-"
            );
        }).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Période début", debutDate.format(REPORT_DATE));
        meta.put("Période fin", finDate.format(REPORT_DATE));
        meta.put("Region", region == null ? "-" : region);
        meta.put("Cluster", cluster == null ? "-" : cluster);
        meta.put("Total apprenants", String.valueOf(rows.size()));

        byte[] pdf = buildPdfTableReport(
                "Rapport heures de formation",
                List.of("Nom", "Prenom", "Centre", "Heures", "Sessions", "Debut formation"),
                rows,
                meta,
                ReportTemplate.HEURES,
                new float[]{90f, 90f, 110f, 55f, 55f, 90f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rapport_heures.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    /**
     * Rapport d'exécution SKA Program (format officiel type Yoto Sud) :
     * uniquement les séances clôturées et les données saisies par le formateur.
     */
    @GetMapping("/seances/pdf")
    public ResponseEntity<byte[]> exportSeancesPdf(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        return exportExecutionPdf(centreId, region, cluster, null, debut, fin, auth);
    }

    @GetMapping("/execution/pdf")
    public ResponseEntity<byte[]> exportExecutionPdf(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) Long formateurId,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));
        List<SessionCours> sessions = loadFilteredClosedSessions(
                user, centreId, region, cluster, formateurId, debutDate, finDate);
        Map<Long, List<EvaluationSession>> evalsBySession = loadEvaluationsBySession(sessions);

        byte[] pdf = rapportExecutionSeancePdfBuilder.build(
                sessions, evalsBySession, cluster, region, debutDate, finDate);

        String scope = cluster != null && !cluster.isBlank()
                ? cluster.replaceAll("[^a-zA-Z0-9_-]", "_")
                : (region != null && !region.isBlank()
                ? region.replaceAll("[^a-zA-Z0-9_-]", "_")
                : (formateurId != null ? "formateur_" + formateurId : "tous"));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=rapport_execution_ska_" + scope + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/execution/seances")
    public ResponseEntity<Map<String, Object>> listExecutionSeances(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) Long formateurId,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));
        List<SessionCours> sessions = loadFilteredClosedSessions(
                user, centreId, region, cluster, formateurId, debutDate, finDate);

        List<Map<String, Object>> rows = new ArrayList<>();
        int presentsTotal = 0;
        for (SessionCours session : sessions) {
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(session.getId());
            int presents = (int) evals.stream().filter(EvaluationSession::isPresent).count();
            presentsTotal += presents;
            rows.add(toExecutionSeanceRow(session, evals.size(), presents));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("total", rows.size());
        body.put("presentsTotal", presentsTotal);
        body.put("periodeDebut", debutDate.toString());
        body.put("periodeFin", finDate.toString());
        body.put("sessions", rows);
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> toExecutionSeanceRow(SessionCours session, int totalEleves, int presents) {
        Centre centre = session.getCentre();
        User formateur = session.getFormateur();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", session.getId());
        row.put("date", session.getHeureDebut() != null
                ? session.getHeureDebut().toLocalDate().toString() : null);
        row.put("heureDebut", session.getHeureDebut() != null
                ? session.getHeureDebut().toLocalTime().toString() : null);
        row.put("creneau", formatSessionCreneau(session));
        row.put("centreId", centre != null ? centre.getId() : null);
        row.put("centreNom", centre != null ? centre.getNom() : null);
        row.put("codeCdej", centre != null ? centre.getCodeCdej() : null);
        row.put("lieuFormation", centre != null ? centre.getLieuFormation() : null);
        row.put("region", centre != null ? centre.getRegion() : null);
        row.put("cluster", centre != null ? centre.getCluster() : null);
        row.put("formateurId", formateur != null ? formateur.getId() : null);
        row.put("formateurNom", formateur != null
                ? formateur.getPrenom() + " " + formateur.getNom() : null);
        row.put("moduleFait", session.getModuleFait() != null ? session.getModuleFait() : session.getTitre());
        row.put("presents", presents);
        row.put("totalEleves", totalEleves);
        row.put("defisSession", session.getDefisSession());
        row.put("etatEquipements", session.getEtatEquipements());
        row.put("statut", session.getStatut());
        return row;
    }

    private static String formatSessionCreneau(SessionCours session) {
        if (session.getHeureDebut() == null) return "-";
        DateTimeFormatter tf = DateTimeFormatter.ofPattern("H'h'mm");
        String start = session.getHeureDebut().toLocalTime().format(tf);
        String end;
        if (session.getHeureFin() != null) {
            end = session.getHeureFin().toLocalTime().format(tf);
        } else if (session.getDureeReelleMinutes() != null && session.getDureeReelleMinutes() > 0) {
            end = session.getHeureDebut().plusMinutes(session.getDureeReelleMinutes()).toLocalTime().format(tf);
        } else if (session.getDureePrevueMinutes() != null && session.getDureePrevueMinutes() > 0) {
            end = session.getHeureDebut().plusMinutes(session.getDureePrevueMinutes()).toLocalTime().format(tf);
        } else {
            end = "-";
        }
        return start + "-" + end;
    }

    @GetMapping("/seances/{sessionId}/execution-pdf")
    public ResponseEntity<byte[]> exportSessionExecutionPdf(
            @PathVariable Long sessionId,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(sessionId).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (session.getCentre() != null) {
            centreAccessService.requireCentreAccess(user, session.getCentre().getId());
        }
        if (user.getRole() == Role.FORMATEUR
                && session.getFormateur() != null
                && !session.getFormateur().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(sessionId);
        byte[] pdf = rapportExecutionSeancePdfBuilder.buildSingle(session, evals);

        String centreName = session.getCentre() != null && session.getCentre().getNom() != null
                ? session.getCentre().getNom().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "centre";
        String date = session.getHeureDebut() != null
                ? session.getHeureDebut().toLocalDate().format(REPORT_DATE).replace("/", "-")
                : "seance";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=rapport_execution_" + centreName + "_" + date + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private List<SessionCours> loadFilteredClosedSessions(
            User user, Long centreId, String region, String cluster, Long formateurId,
            LocalDate debutDate, LocalDate finDate
    ) {
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        List<SessionCours> sessions;
        if (user.getRole() == Role.FORMATEUR) {
            sessions = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId()).stream()
                    .filter(s -> s.getCentre() != null && centreIds.contains(s.getCentre().getId()))
                    .toList();
        } else {
            sessions = sessionCoursRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(s -> s.getCentre() != null && centreIds.contains(s.getCentre().getId()))
                    .toList();
        }
        if (formateurId != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getFormateur() != null && formateurId.equals(s.getFormateur().getId()))
                    .toList();
        }
        return sessions.stream()
                .filter(s -> "CLOTUREE".equalsIgnoreCase(s.getStatut()))
                .filter(s -> {
                    LocalDate date = s.getHeureDebut() != null ? s.getHeureDebut().toLocalDate() : null;
                    return date != null && !date.isBefore(debutDate) && !date.isAfter(finDate);
                })
                .sorted(Comparator.comparing(SessionCours::getHeureDebut))
                .toList();
    }

    private Map<Long, List<EvaluationSession>> loadEvaluationsBySession(List<SessionCours> sessions) {
        Map<Long, List<EvaluationSession>> map = new HashMap<>();
        for (SessionCours session : sessions) {
            map.put(session.getId(), evaluationSessionRepository.findBySessionCoursId(session.getId()));
        }
        return map;
    }

    @GetMapping("/activites/pdf")
    public ResponseEntity<byte[]> exportActivitesPdf(
            @RequestParam(required = false) Long centreId,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String cluster,
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        List<Long> centreIds = filterCentreIds(user, centreId, region, cluster);
        LocalDate debutDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate finDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));
        List<ModuleFormation> formations = loadFormations(user, centreIds, debutDate, finDate);
        Map<Long, String> centres = centreNames(centreIds);
        Set<Long> formateurIds = formations.stream()
                .map(ModuleFormation::getFormateurId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, String> formateurs = userNames(formateurIds);

        List<List<String>> rows = formations.stream().map(f -> List.of(
                f.getDate() != null ? f.getDate().format(REPORT_DATE) : "-",
                centres.getOrDefault(f.getCentreId(), f.getCentreId() != null ? String.valueOf(f.getCentreId()) : "-"),
                formateurs.getOrDefault(f.getFormateurId(), f.getFormateurId() != null ? String.valueOf(f.getFormateurId()) : "-"),
                f.getTitre() != null ? f.getTitre() : "-",
                f.getDureeHeures() != null ? String.format("%.1f h", f.getDureeHeures()) : "0.0 h",
                f.getElevesPresents() != null ? String.valueOf(f.getElevesPresents().size()) : "0"
        )).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Période début", debutDate.format(REPORT_DATE));
        meta.put("Période fin", finDate.format(REPORT_DATE));
        meta.put("Region", region == null ? "-" : region);
        meta.put("Cluster", cluster == null ? "-" : cluster);
        meta.put("Total activites", String.valueOf(rows.size()));

        byte[] pdf = buildPdfTableReport(
                "Rapport activites",
                List.of("Date", "Centre", "Formateur", "Titre", "Duree", "Presents"),
                rows,
                meta,
                ReportTemplate.ACTIVITES,
                new float[]{68f, 62f, 62f, 190f, 60f, 60f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rapport_activites.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR')")
    public ResponseEntity<byte[]> exportTransactions(
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        LocalDate startDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate endDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<Transaction> transactions;
        if (user.getRole() == Role.FORMATEUR) {
            transactions = transactionRepository.findByFormateurIdAndCreatedAtBetweenOrderByCreatedAtDesc(user.getId(), start, end);
        } else {
            transactions = transactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        }

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Transactions");
        CellStyle headerStyle = buildHeaderStyle(workbook);
        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID", "Bénéficiaire", "Montant (FCFA)", "Type", "Description", "Justificatif", "Statut", "Date de création"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (Transaction tx : transactions) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(tx.getId());
            row.createCell(1).setCellValue(tx.getFormateur().getPrenom() + " " + tx.getFormateur().getNom());
            row.createCell(2).setCellValue(tx.getMontant());
            row.createCell(3).setCellValue(tx.getType());
            row.createCell(4).setCellValue(tx.getDescription());
            row.createCell(5).setCellValue(tx.getJustificatifNom() != null ? tx.getJustificatifNom() : (tx.getJustificatifUrl() != null ? "Oui" : "Non"));
            row.createCell(6).setCellValue(tx.getStatut());
            row.createCell(7).setCellValue(tx.getCreatedAt().toString());
        }

        addLogoToSheet(workbook, sheet, columns.length - 1);
        finalizeExcelSheet(sheet, columns.length, "Liste des transactions");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=transactions.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/transactions/pdf")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR')")
    public ResponseEntity<byte[]> exportTransactionsPdf(
            @RequestParam(required = false) String debut,
            @RequestParam(required = false) String fin,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        LocalDate startDate = parseDateOrDefault(debut, LocalDate.of(2000, 1, 1));
        LocalDate endDate = parseDateOrDefault(fin, LocalDate.now().plusYears(2));
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<Transaction> transactions;
        if (user.getRole() == Role.FORMATEUR) {
            transactions = transactionRepository.findByFormateurIdAndCreatedAtBetweenOrderByCreatedAtDesc(user.getId(), start, end);
        } else {
            transactions = transactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        }

        List<List<String>> rows = transactions.stream().map(tx -> List.of(
                String.valueOf(tx.getId()),
                tx.getFormateur().getPrenom() + " " + tx.getFormateur().getNom(),
                String.format("%.0f FCFA", tx.getMontant() == null ? 0.0 : tx.getMontant()),
                tx.getType() != null ? tx.getType() : "-",
                tx.getDescription() != null ? tx.getDescription() : "-",
                tx.getJustificatifUrl() != null ? "Oui" : "Non",
                tx.getStatut() != null ? tx.getStatut() : "-",
                tx.getCreatedAt() != null ? tx.getCreatedAt().format(REPORT_DATE_TIME) : "-"
        )).toList();

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Période début", startDate.format(REPORT_DATE));
        meta.put("Période fin", endDate.format(REPORT_DATE));
        meta.put("Total transactions", String.valueOf(rows.size()));

        byte[] pdf = buildPdfTableReport(
                "Rapport financier",
                List.of("ID", "Bénéficiaire", "Montant", "Type", "Description", "Justif.", "Statut", "Date"),
                rows,
                meta,
                ReportTemplate.FINANCIER,
                new float[]{30f, 100f, 68f, 65f, 150f, 45f, 58f, 90f}
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rapport_financier.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    /**
     * Rapport annuel formateur par centre : agrège les données de chaque séance,
     * le projet final de chaque enfant et la synthèse saisie par le formateur.
     */
    @GetMapping("/centre/{centreId}/rapport-formateur-apercu")
    public ResponseEntity<?> apercuRapportFormateur(
            @PathVariable Long centreId,
            @RequestParam String debut,
            @RequestParam String fin,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        centreAccessService.requireCentreAccess(user, centreId);
        Centre centre = centreRepository.findById(centreId).orElse(null);
        if (centre == null) return ResponseEntity.notFound().build();

        LocalDate debutDate = LocalDate.parse(debut);
        LocalDate finDate = LocalDate.parse(fin);
        if (finDate.isBefore(debutDate)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "La date de fin doit être postérieure à la date de début."
            ));
        }

        List<Eleve> eleves = eleveRepository.findByCentreId(centreId);
        return ResponseEntity.ok(rapportFormateurPdfBuilder.buildApercu(centre, eleves, debutDate, finDate));
    }

    @GetMapping("/centre/{centreId}/rapport-formateur-pdf")
    public ResponseEntity<byte[]> exportRapportFormateurCentre(
            @PathVariable Long centreId,
            @RequestParam String debut,
            @RequestParam String fin,
            @RequestParam(defaultValue = "Module 01 : Apprendre à coder avec Scratch") String moduleLabel,
            Authentication auth
    ) throws IOException {
        User user = (User) auth.getPrincipal();
        centreAccessService.requireCentreAccess(user, centreId);

        Centre centre = centreRepository.findById(centreId).orElse(null);
        if (centre == null) return ResponseEntity.notFound().build();

        LocalDate debutDate = LocalDate.parse(debut);
        LocalDate finDate = LocalDate.parse(fin);
        if (finDate.isBefore(debutDate)) {
            return ResponseEntity.badRequest().build();
        }

        List<Eleve> eleves = eleveRepository.findByCentreId(centreId);
        RapportSyntheseCentre synthese = rapportFormateurPdfBuilder
                .loadSynthese(centreId, moduleLabel, debutDate, finDate)
                .orElse(null);

        byte[] pdf = rapportFormateurPdfBuilder.build(
                centre, user, eleves, synthese, debutDate, finDate, moduleLabel);

        String safeName = centre.getNom() != null
                ? centre.getNom().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "centre";
        String periode = debutDate.format(REPORT_DATE) + "_au_" + finDate.format(REPORT_DATE);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=rapport_formateur_" + safeName + "_" + periode + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
