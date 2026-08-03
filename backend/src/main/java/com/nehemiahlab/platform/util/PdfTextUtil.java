package com.nehemiahlab.platform.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;

import java.awt.Color;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Helpers texte pour rapports PDF narratifs. */
public final class PdfTextUtil {
    private PdfTextUtil() {}

    /**
     * Dessine le logo SKA (branding/ska-logo.png) dans l'en-tête d'un rapport, avec un
     * repli "SKA" en texte si l'image est indisponible — même logique que celle déjà
     * utilisée par les exports (heures, activités, financier...) afin que TOUS les
     * rapports PDF (y compris exécution de séance et rapport formateur) affichent le
     * même en-tête avec logo.
     */
    public static boolean drawLogoOrFallback(
            PDDocument document, PDPageContentStream content, PDType1Font titleFont,
            float x, float y, float size
    ) {
        try {
            ClassPathResource resource = new ClassPathResource("branding/ska-logo.png");
            if (resource.exists()) {
                PDImageXObject logo = PDImageXObject.createFromByteArray(
                        document, resource.getInputStream().readAllBytes(), "ska-logo");
                content.drawImage(logo, x, y, size, size);
                return true;
            }
        } catch (Exception ignored) {
            // Repli texte ci-dessous si le logo est indisponible ou illisible.
        }
        try {
            content.setNonStrokingColor(Color.WHITE);
            content.addRect(x, y, size, size);
            content.fill();
            content.beginText();
            content.setNonStrokingColor(new Color(0, 75, 87));
            content.setFont(titleFont, 8f);
            content.newLineAtOffset(x + size * 0.17f, y + size * 0.35f);
            content.showText("SKA");
            content.endText();
        } catch (IOException ignored) {
            return false;
        }
        return false;
    }

    public static List<String> wrap(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        if (text == null || text.isBlank()) return List.of("-");
        // IMPORTANT : on sanitize AVANT de mesurer/decouper le texte, pas seulement
        // au moment de l'ecrire dans le PDF. Les polices Standard 14 (Helvetica) du
        // PDF n'acceptent que l'encodage WinAnsi : un caractere absent de cet
        // encodage (guillemets courbes, tirets longs, emojis... frequents dans les
        // saisies au telephone des formateurs pour "defis de la seance" ou "etat des
        // equipements") fait planter font.getStringWidth() avec une
        // IllegalArgumentException avant meme d'atteindre le sanitize() utilise plus
        // bas pour l'affichage, ce qui cassait la generation de rapport des qu'une
        // seance contenait ce genre de texte.
        String cleaned = sanitize(text).replace("\r", "").replace('\t', ' ');
        List<String> lines = new ArrayList<>();
        for (String paragraph : cleaned.split("\n")) {
            if (paragraph.isBlank()) {
                lines.add(" ");
                continue;
            }
            StringBuilder current = new StringBuilder();
            for (String rawWord : paragraph.trim().split("\\s+")) {
                String word = rawWord;
                // Un seul "mot" sans espace (ex: un creneau horaire "13h30-23h00" ou
                // un intitule de colonne comme "Presents") peut a lui seul depasser la
                // largeur de la colonne : on le decoupe alors caractere par caractere
                // au lieu de le laisser deborder sur la colonne suivante. C'est ce
                // debordement silencieux qui collait "Creneau" et "Presents" (et leur
                // contenu) dans les rapports d'execution de seance.
                while (font.getStringWidth(word) / 1000f * fontSize > maxWidth && word.length() > 1) {
                    int cut = word.length();
                    while (cut > 1 && font.getStringWidth(word.substring(0, cut)) / 1000f * fontSize > maxWidth) {
                        cut--;
                    }
                    if (!current.isEmpty()) {
                        lines.add(current.toString());
                        current.setLength(0);
                    }
                    lines.add(word.substring(0, cut));
                    word = word.substring(cut);
                }
                String candidate = current.isEmpty() ? word : current + " " + word;
                float width = font.getStringWidth(candidate) / 1000f * fontSize;
                if (current.isEmpty() || width <= maxWidth) {
                    current.setLength(0);
                    current.append(candidate);
                } else {
                    lines.add(current.toString());
                    current.setLength(0);
                    current.append(word);
                }
            }
            if (!current.isEmpty()) lines.add(current.toString());
        }
        return lines.isEmpty() ? List.of("-") : lines;
    }

    public static float drawWrapped(
            PDPageContentStream content,
            String text,
            PDType1Font font,
            float fontSize,
            float x,
            float y,
            float maxWidth,
            float lineHeight,
            Color color
    ) throws IOException {
        List<String> lines = wrap(text, font, fontSize, maxWidth);
        content.setNonStrokingColor(color);
        for (String line : lines) {
            content.beginText();
            content.setFont(font, fontSize);
            content.newLineAtOffset(x, y);
            content.showText(sanitize(line));
            content.endText();
            y -= lineHeight;
        }
        return y;
    }

    public static String sanitize(String value) {
        if (value == null) return "";
        // Les polices Standard 14 utilisent WinAnsi : conserver le français et
        // normaliser uniquement les signes typographiques non encodables.
        String s = value
                .replace('’', '\'')
                .replace('‘', '\'')
                .replace('“', '"')
                .replace('”', '"')
                .replace("–", "-")
                .replace("—", "-")
                .replace("…", "...");
        return s.replaceAll("[^\\x20-\\x7E\\xA0-\\xFF\\n]", "?");
    }

    // ------------------------------------------------------------------
    // Tableaux : mêmes couleurs/bordures/zébrage que les exports officiels
    // (voir RapportController#buildPdfTableReport) afin que TOUS les
    // rapports (exécution de séance, exports listes, etc.) affichent de
    // vrais tableaux avec colonnes et bordures, jamais du texte brut
    // séparé par des « | ».
    // ------------------------------------------------------------------

    private static final Color TABLE_HEADER_BG = new Color(0, 75, 87);
    private static final Color TABLE_HEADER_BORDER = new Color(15, 23, 42);
    private static final Color TABLE_HEADER_SEP = new Color(71, 85, 105);
    private static final Color TABLE_ROW_ZEBRA = new Color(248, 250, 252);
    private static final Color TABLE_ROW_BORDER = new Color(214, 224, 234);
    private static final Color TABLE_CELL_SEP = new Color(226, 232, 240);
    private static final Color TABLE_TEXT = new Color(30, 41, 59);

    public static float sumWidths(float[] widths) {
        float total = 0f;
        for (float w : widths) total += w;
        return total;
    }

    private static final float TABLE_HEADER_FONT_SIZE = 8.6f;
    private static final float TABLE_HEADER_LINE_HEIGHT = 10.5f;

    /**
     * Dessine l'entête (fond plein + texte blanc + séparateurs de colonnes) d'un tableau.
     * Les intitulés sont repliés colonne par colonne (comme les données) et la hauteur
     * de l'entête s'ajuste en conséquence : un intitulé plus large que sa colonne (ex.
     * "Présents") passe sur 2 lignes au lieu de déborder visuellement sur la colonne
     * suivante.
     */
    public static float drawTableHeaderRow(
            PDPageContentStream content,
            List<String> headers,
            float[] widths,
            float x,
            float y,
            PDType1Font titleFont
    ) throws IOException {
        List<List<String>> wrappedHeaders = new ArrayList<>();
        int maxLines = 1;
        for (int i = 0; i < headers.size(); i++) {
            float maxTextWidth = Math.max(20f, widths[i] - 8f);
            List<String> lines = wrap(headers.get(i), titleFont, TABLE_HEADER_FONT_SIZE, maxTextWidth);
            wrappedHeaders.add(lines);
            maxLines = Math.max(maxLines, lines.size());
        }
        float headerHeight = Math.max(20f, maxLines * TABLE_HEADER_LINE_HEIGHT + 8f);

        float tableWidth = sumWidths(widths);
        content.setNonStrokingColor(TABLE_HEADER_BG);
        content.addRect(x, y - headerHeight, tableWidth, headerHeight);
        content.fill();
        content.setStrokingColor(TABLE_HEADER_BORDER);
        content.addRect(x, y - headerHeight, tableWidth, headerHeight);
        content.stroke();

        float cx = x;
        for (int i = 0; i < headers.size(); i++) {
            if (i > 0) {
                content.setStrokingColor(TABLE_HEADER_SEP);
                content.moveTo(cx, y);
                content.lineTo(cx, y - headerHeight);
                content.stroke();
            }
            float textY = y - 13f;
            for (String line : wrappedHeaders.get(i)) {
                content.beginText();
                content.setNonStrokingColor(Color.WHITE);
                content.setFont(titleFont, TABLE_HEADER_FONT_SIZE);
                content.newLineAtOffset(cx + 4f, textY);
                content.showText(sanitize(line));
                content.endText();
                textY -= TABLE_HEADER_LINE_HEIGHT;
            }
            cx += widths[i];
        }
        return y - headerHeight;
    }

    /** Calcule la hauteur nécessaire pour une ligne de tableau (texte replié colonne par colonne). */
    public static float measureTableRowHeight(
            List<String> row,
            float[] widths,
            PDType1Font bodyFont,
            float fontSize,
            float lineHeight
    ) throws IOException {
        int maxLines = 1;
        for (int i = 0; i < widths.length; i++) {
            String cell = i < row.size() ? row.get(i) : "-";
            float maxTextWidth = Math.max(20f, widths[i] - 8f);
            List<String> lines = wrap(cell, bodyFont, fontSize, maxTextWidth);
            maxLines = Math.max(maxLines, lines.size());
        }
        return (maxLines * lineHeight) + 8f;
    }

    /** Dessine une ligne de données du tableau (fond zébré + bordures + texte replié). */
    public static float drawTableDataRow(
            PDPageContentStream content,
            List<String> row,
            float[] widths,
            float x,
            float y,
            float rowHeight,
            PDType1Font bodyFont,
            float fontSize,
            float lineHeight,
            boolean zebra
    ) throws IOException {
        float tableWidth = sumWidths(widths);
        if (zebra) {
            content.setNonStrokingColor(TABLE_ROW_ZEBRA);
            content.addRect(x, y - rowHeight, tableWidth, rowHeight);
            content.fill();
        }
        content.setStrokingColor(TABLE_ROW_BORDER);
        content.addRect(x, y - rowHeight, tableWidth, rowHeight);
        content.stroke();

        float cx = x;
        for (int i = 0; i < widths.length; i++) {
            float w = widths[i];
            content.setStrokingColor(TABLE_CELL_SEP);
            content.moveTo(cx, y);
            content.lineTo(cx, y - rowHeight);
            content.stroke();

            String cell = i < row.size() ? row.get(i) : "-";
            float maxTextWidth = Math.max(20f, w - 8f);
            List<String> lines = wrap(cell, bodyFont, fontSize, maxTextWidth);
            float textY = y - 12f;
            for (String line : lines) {
                content.beginText();
                content.setNonStrokingColor(TABLE_TEXT);
                content.setFont(bodyFont, fontSize);
                content.newLineAtOffset(cx + 4f, textY);
                content.showText(sanitize(line));
                content.endText();
                textY -= lineHeight;
            }
            cx += w;
        }
        content.moveTo(x + tableWidth, y);
        content.lineTo(x + tableWidth, y - rowHeight);
        content.stroke();
        return y - rowHeight;
    }
}
