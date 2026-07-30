package com.nehemiahlab.platform.util;

import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.awt.Color;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Helpers texte pour rapports PDF narratifs. */
public final class PdfTextUtil {
    private PdfTextUtil() {}

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
            String[] words = paragraph.trim().split("\\s+");
            StringBuilder current = new StringBuilder();
            for (String word : words) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                float width = font.getStringWidth(candidate) / 1000f * fontSize;
                if (width <= maxWidth) {
                    current.setLength(0);
                    current.append(candidate);
                } else {
                    if (!current.isEmpty()) lines.add(current.toString());
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
}
