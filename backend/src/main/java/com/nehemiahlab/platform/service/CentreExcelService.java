package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;

@Service
public class CentreExcelService {

    private final CentreRepository centreRepository;
    private final EleveRepository eleveRepository;
    private final UserRepository userRepository;
    private final MatriculeService matriculeService;
    private final PasswordEncoder passwordEncoder;

    public CentreExcelService(
            CentreRepository centreRepository,
            EleveRepository eleveRepository,
            UserRepository userRepository,
            MatriculeService matriculeService,
            PasswordEncoder passwordEncoder
    ) {
        this.centreRepository = centreRepository;
        this.eleveRepository = eleveRepository;
        this.userRepository = userRepository;
        this.matriculeService = matriculeService;
        this.passwordEncoder = passwordEncoder;
    }

    public byte[] exportWorkbook() throws Exception {
        List<Centre> centres = centreRepository.findAll();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = headerStyle(workbook);

            Sheet centresSheet = workbook.createSheet("Centres");
            String[] centreCols = {
                    "NomCentre", "Adresse", "Ville", "Region", "Cluster",
                    "TelResponsable",
                    "CoordinateurNom", "CoordinateurPrenom", "CoordinateurTelephone",
                    "FormateurNom", "FormateurPrenom", "FormateurEmail", "FormateurTelephone"
            };
            writeHeader(centresSheet, centreCols, headerStyle);

            int rowIdx = 1;
            for (Centre c : centres) {
                User form = firstFormateur(c);
                Row row = centresSheet.createRow(rowIdx++);
                int col = 0;
                row.createCell(col++).setCellValue(nz(c.getNom()));
                row.createCell(col++).setCellValue(nz(c.getAdresse()));
                row.createCell(col++).setCellValue(nz(c.getVille()));
                row.createCell(col++).setCellValue(nz(c.getRegion()));
                row.createCell(col++).setCellValue(nz(c.getCluster()));
                row.createCell(col++).setCellValue(nz(c.getTelephoneResponsable()));
                row.createCell(col++).setCellValue(firstNonBlank(c.getCoordinateurNom(),
                        c.getCoordinateur() != null ? c.getCoordinateur().getNom() : null));
                row.createCell(col++).setCellValue(firstNonBlank(c.getCoordinateurPrenom(),
                        c.getCoordinateur() != null ? c.getCoordinateur().getPrenom() : null));
                row.createCell(col++).setCellValue(firstNonBlank(c.getTelephoneCoordinateur(),
                        c.getCoordinateur() != null ? c.getCoordinateur().getTelephone() : null));
                row.createCell(col++).setCellValue(form != null ? nz(form.getNom()) : "");
                row.createCell(col++).setCellValue(form != null ? nz(form.getPrenom()) : "");
                row.createCell(col++).setCellValue(form != null ? nz(form.getEmail()) : "");
                row.createCell(col++).setCellValue(firstNonBlank(
                        c.getTelephoneFormateur(),
                        form != null ? form.getTelephone() : null
                ));
            }
            for (int i = 0; i < centreCols.length; i++) centresSheet.autoSizeColumn(i);

            Sheet elevesSheet = workbook.createSheet("Eleves");
            String[] eleveCols = {
                    "NomCentre", "Nom", "Prenom", "Age", "Sexe", "Classe", "DateDebut", "Matricule"
            };
            writeHeader(elevesSheet, eleveCols, headerStyle);
            int eRow = 1;
            for (Centre c : centres) {
                for (Eleve e : eleveRepository.findByCentreId(c.getId())) {
                    Row row = elevesSheet.createRow(eRow++);
                    int col = 0;
                    row.createCell(col++).setCellValue(nz(c.getNom()));
                    row.createCell(col++).setCellValue(nz(e.getNom()));
                    row.createCell(col++).setCellValue(nz(e.getPrenom()));
                    row.createCell(col++).setCellValue(e.getAge() != null ? e.getAge() : 0);
                    row.createCell(col++).setCellValue(nz(e.getSexe()));
                    row.createCell(col++).setCellValue(nz(e.getClasse()));
                    row.createCell(col++).setCellValue(e.getDateDebutFormation() != null
                            ? e.getDateDebutFormation().toString() : "");
                    row.createCell(col++).setCellValue(nz(e.getMatricule()));
                }
            }
            for (int i = 0; i < eleveCols.length; i++) elevesSheet.autoSizeColumn(i);

            Sheet guide = workbook.createSheet("Guide");
            guide.createRow(0).createCell(0).setCellValue("Export / import SKA — Centres + Eleves + contacts");
            guide.createRow(1).createCell(0).setCellValue(
                    "1) CoordinateurNom / Prenom / Telephone : infos du centre UNIQUEMENT (aucun compte cree)."
            );
            guide.createRow(2).createCell(0).setCellValue(
                    "2) Formateur : si le formateur existe deja (email ou nom), il est assigne au centre sans doublon."
            );
            guide.createRow(3).createCell(0).setCellValue(
                    "3) Si le formateur n'existe pas encore, un compte FORMATEUR est cree (actif, mdp password123)."
            );
            guide.createRow(4).createCell(0).setCellValue(
                    "4) Eleves : NomCentre doit correspondre. Doublons nom+prenom dans le meme centre ignores."
            );
            guide.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Transactional
    public Map<String, Object> importWorkbook(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier Excel manquant.");
        }

        int centresCreated = 0, centresUpdated = 0;
        int elevesCreated = 0, elevesSkipped = 0;
        int formateursAssigned = 0, formateursCreated = 0;
        List<String> warnings = new ArrayList<>();
        // Dedup formateurs crees pendant cet import (email / cle nom)
        Set<String> seenFormateurKeys = new HashSet<>();

        try (InputStream in = file.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet centresSheet = workbook.getSheet("Centres");
            if (centresSheet == null && workbook.getNumberOfSheets() > 0) {
                centresSheet = workbook.getSheetAt(0);
            }
            Sheet elevesSheet = workbook.getSheet("Eleves");
            if (elevesSheet == null && workbook.getNumberOfSheets() > 1) {
                elevesSheet = workbook.getSheetAt(1);
            }

            Map<String, Integer> centreHeader = headerMap(centresSheet);
            if (centresSheet != null) {
                for (int r = 1; r <= centresSheet.getLastRowNum(); r++) {
                    Row row = centresSheet.getRow(r);
                    if (row == null) continue;
                    String nomCentre = cell(row, centreHeader, "NomCentre", "Nom", "Centre");
                    if (nomCentre.isBlank()) continue;

                    Optional<Centre> existing = centreRepository.findByNomIgnoreCase(nomCentre.trim());
                    Centre centre = existing.orElseGet(() -> Centre.builder()
                            .nom(nomCentre.trim())
                            .adresse("A preciser")
                            .ville("A preciser")
                            .formateurs(new HashSet<>())
                            .build());
                    boolean isNew = existing.isEmpty();

                    String adresse = cell(row, centreHeader, "Adresse");
                    String ville = cell(row, centreHeader, "Ville");
                    String region = cell(row, centreHeader, "Region", "Région");
                    String cluster = cell(row, centreHeader, "Cluster");
                    String telResp = digits(cell(row, centreHeader, "TelResponsable", "TelephoneResponsable", "TelCentre"));
                    String telCoord = digits(cell(row, centreHeader, "CoordinateurTelephone", "TelCoordinateur"));
                    String telForm = digits(cell(row, centreHeader, "FormateurTelephone", "TelFormateur"));
                    String cNom = cell(row, centreHeader, "CoordinateurNom");
                    String cPrenom = cell(row, centreHeader, "CoordinateurPrenom");

                    if (!adresse.isBlank()) centre.setAdresse(adresse);
                    if (!ville.isBlank()) centre.setVille(ville);
                    if (!region.isBlank()) centre.setRegion(region);
                    if (!cluster.isBlank()) centre.setCluster(cluster);
                    if (telResp != null) centre.setTelephoneResponsable(telResp);

                    // Coordinateur = infos centre seulement (PAS de compte utilisateur)
                    if (!cNom.isBlank()) centre.setCoordinateurNom(cNom.trim());
                    if (!cPrenom.isBlank()) centre.setCoordinateurPrenom(cPrenom.trim());
                    if (telCoord != null) centre.setTelephoneCoordinateur(telCoord);

                    if (centre.getAdresse() == null || centre.getAdresse().isBlank()) centre.setAdresse("A preciser");
                    if (centre.getVille() == null || centre.getVille().isBlank()) centre.setVille("A preciser");

                    // Formateur : retrouver existant ou creer 1 seule fois, puis assigner (max 1 / centre, sans doublon)
                    String fEmail = cell(row, centreHeader, "FormateurEmail").trim().toLowerCase();
                    String fNom = cell(row, centreHeader, "FormateurNom");
                    String fPrenom = cell(row, centreHeader, "FormateurPrenom");
                    if (!fEmail.isBlank() || !fNom.isBlank() || !fPrenom.isBlank()) {
                        FormateurResult fr = resolveFormateurNoDuplicate(
                                fPrenom, fNom, fEmail, telForm, seenFormateurKeys, warnings, r + 1
                        );
                        if (fr != null && fr.user != null) {
                            if (centre.getFormateurs() == null) centre.setFormateurs(new HashSet<>());
                            // Un seul formateur par centre — remplace proprement
                            boolean already = centre.getFormateurs().stream()
                                    .anyMatch(f -> f.getId().equals(fr.user.getId()));
                            centre.getFormateurs().clear();
                            centre.getFormateurs().add(fr.user);
                            if (!already) formateursAssigned++;
                            if (fr.created) formateursCreated++;
                            if (telForm != null) centre.setTelephoneFormateur(telForm);
                        }
                    } else if (telForm != null) {
                        centre.setTelephoneFormateur(telForm);
                    }

                    centreRepository.save(centre);
                    if (isNew) centresCreated++;
                    else centresUpdated++;
                }
            }

            Map<String, Integer> eleveHeader = headerMap(elevesSheet);
            Set<String> elevesSeenInFile = new HashSet<>();
            if (elevesSheet != null) {
                for (int r = 1; r <= elevesSheet.getLastRowNum(); r++) {
                    Row row = elevesSheet.getRow(r);
                    if (row == null) continue;
                    String nomCentre = cell(row, eleveHeader, "NomCentre", "Centre");
                    String nom = cell(row, eleveHeader, "Nom");
                    String prenom = cell(row, eleveHeader, "Prenom", "Prénom");
                    if (nomCentre.isBlank() || nom.isBlank() || prenom.isBlank()) continue;

                    String dedupKey = nomCentre.trim().toLowerCase() + "|"
                            + nom.trim().toLowerCase() + "|"
                            + prenom.trim().toLowerCase();
                    if (!elevesSeenInFile.add(dedupKey)) {
                        elevesSkipped++;
                        continue;
                    }

                    Optional<Centre> centreOpt = centreRepository.findByNomIgnoreCase(nomCentre.trim());
                    if (centreOpt.isEmpty()) {
                        warnings.add("Eleve " + prenom + " " + nom + ": centre introuvable (" + nomCentre + ").");
                        elevesSkipped++;
                        continue;
                    }
                    Centre centre = centreOpt.get();

                    boolean exists = eleveRepository.findByCentreId(centre.getId()).stream()
                            .anyMatch(e -> e.getNom().equalsIgnoreCase(nom.trim())
                                    && e.getPrenom().equalsIgnoreCase(prenom.trim()));
                    if (exists) {
                        elevesSkipped++;
                        continue;
                    }

                    int age = parseInt(cell(row, eleveHeader, "Age", "Âge"), 12);
                    String sexe = cell(row, eleveHeader, "Sexe").toUpperCase();
                    if (!sexe.equals("M") && !sexe.equals("F")) sexe = "M";
                    String classe = cell(row, eleveHeader, "Classe");
                    if (classe.isBlank()) classe = "Non precisee";
                    LocalDate debut = parseDate(cell(row, eleveHeader, "DateDebut", "DateDebutFormation"));
                    if (debut == null) debut = LocalDate.now();

                    User formateur = firstFormateur(centre);

                    Eleve eleve = Eleve.builder()
                            .nom(nom.trim())
                            .prenom(prenom.trim())
                            .matricule(matriculeService.generateUniqueMatricule())
                            .age(age)
                            .sexe(sexe)
                            .classe(classe)
                            .centre(centre)
                            .formateur(formateur)
                            .dateDebutFormation(debut)
                            .build();
                    eleveRepository.save(eleve);
                    elevesCreated++;
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("centresCreated", centresCreated);
        result.put("centresUpdated", centresUpdated);
        result.put("elevesCreated", elevesCreated);
        result.put("elevesSkipped", elevesSkipped);
        result.put("formateursAssigned", formateursAssigned);
        result.put("formateursCreated", formateursCreated);
        result.put("coordinateursCreated", 0);
        result.put("warnings", warnings);
        result.put("message", "Import termine : "
                + centresCreated + " centre(s) cree(s), "
                + centresUpdated + " mis a jour, "
                + elevesCreated + " eleve(s) ajoute(s), "
                + formateursCreated + " formateur(s) cree(s), "
                + formateursAssigned + " affectation(s). "
                + "Coordinateurs enregistres comme contacts (sans compte).");
        return result;
    }

    private record FormateurResult(User user, boolean created) {}

    /**
     * Retrouve un formateur existant (email puis nom/prenom) ou en cree un seul.
     * Jamais de doublon dans la liste des formateurs.
     */
    private FormateurResult resolveFormateurNoDuplicate(
            String prenom,
            String nom,
            String email,
            String telephone,
            Set<String> seenKeys,
            List<String> warnings,
            int excelRow
    ) {
        String n = nom == null ? "" : nom.trim();
        String p = prenom == null ? "" : prenom.trim();
        String mail = email == null ? "" : email.trim().toLowerCase();

        String key = !mail.isBlank()
                ? "email:" + mail
                : "name:" + p.toLowerCase() + "|" + n.toLowerCase();
        if (key.equals("name:|")) {
            warnings.add("Ligne " + excelRow + ": formateur ignore (nom/email manquants).");
            return null;
        }

        // Deja traite dans ce fichier Excel → réutiliser, jamais recréer
        if (seenKeys.contains(key)) {
            User already = findExistingFormateur(p, n, mail);
            if (already != null) return new FormateurResult(already, false);
            warnings.add("Ligne " + excelRow + ": formateur deja traite dans le fichier — ignore.");
            return null;
        }

        User existing = findExistingFormateur(p, n, mail);
        if (existing != null) {
            seenKeys.add(key);
            seenKeys.add("email:" + existing.getEmail().toLowerCase());
            seenKeys.add("name:" + existing.getPrenom().toLowerCase() + "|" + existing.getNom().toLowerCase());
            if (telephone != null && (existing.getTelephone() == null || existing.getTelephone().isBlank())) {
                existing.setTelephone(telephone);
                existing = userRepository.save(existing);
            }
            return new FormateurResult(existing, false);
        }

        if (mail.isBlank()) {
            mail = ("form." + slug(p) + "." + slug(n) + "@ska.import.local").toLowerCase();
            Optional<User> byGenerated = userRepository.findByEmail(mail);
            if (byGenerated.isPresent()) {
                User u = byGenerated.get();
                if (u.getRole() == Role.FORMATEUR) {
                    seenKeys.add(key);
                    seenKeys.add("email:" + mail);
                    return new FormateurResult(u, false);
                }
                warnings.add("Ligne " + excelRow + ": email genere deja pris — formateur non cree.");
                return null;
            }
        }

        User created = User.builder()
                .nom(n.isBlank() ? "Formateur" : n)
                .prenom(p.isBlank() ? "SKA" : p)
                .email(mail)
                .motDePasse(passwordEncoder.encode("password123"))
                .role(Role.FORMATEUR)
                .telephone(telephone)
                .actif(true)
                .build();
        created = userRepository.save(created);
        seenKeys.add(key);
        seenKeys.add("email:" + mail);
        seenKeys.add("name:" + created.getPrenom().toLowerCase() + "|" + created.getNom().toLowerCase());
        return new FormateurResult(created, true);
    }

    private User findExistingFormateur(String prenom, String nom, String email) {
        if (email != null && !email.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(email.trim().toLowerCase());
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                return u.getRole() == Role.FORMATEUR ? u : null;
            }
        }
        if ((prenom != null && !prenom.isBlank()) || (nom != null && !nom.isBlank())) {
            return userRepository.findByRole(Role.FORMATEUR).stream()
                    .filter(u -> (nom == null || nom.isBlank() || u.getNom().equalsIgnoreCase(nom.trim()))
                            && (prenom == null || prenom.isBlank() || u.getPrenom().equalsIgnoreCase(prenom.trim())))
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private static User firstFormateur(Centre c) {
        if (c.getFormateurs() == null || c.getFormateurs().isEmpty()) return null;
        return c.getFormateurs().iterator().next();
    }

    private static CellStyle headerStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private static void writeHeader(Sheet sheet, String[] cols, CellStyle style) {
        Row header = sheet.createRow(0);
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(style);
        }
    }

    private static Map<String, Integer> headerMap(Sheet sheet) {
        Map<String, Integer> map = new HashMap<>();
        if (sheet == null || sheet.getRow(0) == null) return map;
        Row header = sheet.getRow(0);
        for (int i = 0; i < header.getLastCellNum(); i++) {
            String name = cellValue(header.getCell(i)).trim();
            if (!name.isBlank()) map.put(name.toLowerCase(Locale.ROOT), i);
        }
        return map;
    }

    private static String cell(Row row, Map<String, Integer> header, String... keys) {
        for (String key : keys) {
            Integer idx = header.get(key.toLowerCase(Locale.ROOT));
            if (idx != null) return cellValue(row.getCell(idx)).trim();
        }
        return "";
    }

    private static String cellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double v = cell.getNumericCellValue();
                if (Math.floor(v) == v) yield String.valueOf((long) v);
                yield String.valueOf(v);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private static String digits(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String d = raw.replaceAll("\\D", "");
        return d.isBlank() ? null : d;
    }

    private static int parseInt(String raw, int fallback) {
        try {
            if (raw == null || raw.isBlank()) return fallback;
            return (int) Double.parseDouble(raw.replace(',', '.'));
        } catch (Exception e) {
            return fallback;
        }
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.trim().substring(0, Math.min(10, raw.trim().length())));
        } catch (Exception e) {
            return null;
        }
    }

    private static String nz(String v) {
        return v == null ? "" : v;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private static String slug(String value) {
        if (value == null || value.isBlank()) return "x";
        String s = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
        return s.isBlank() ? "x" : s;
    }
}
