package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.Transaction;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.TransactionRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/rapports")
public class RapportController {

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping("/eleves")
    public ResponseEntity<byte[]> exportEleves(@RequestParam(required = false) Long centreId) throws IOException {
        List<Eleve> eleves;
        if (centreId != null) {
            eleves = eleveRepository.findByCentreId(centreId);
        } else {
            eleves = eleveRepository.findAll();
        }

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Apprenants");

        // Style header
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.RED.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);

        // Header Row
        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID", "Nom", "Prénom", "Âge", "Sexe", "Classe", "Centre", "Total Heures", "Projet"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        // Data Rows
        int rowNum = 1;
        for (Eleve eleve : eleves) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(eleve.getId());
            row.createCell(1).setCellValue(eleve.getNom());
            row.createCell(2).setCellValue(eleve.getPrenom());
            row.createCell(3).setCellValue(eleve.getAge());
            row.createCell(4).setCellValue(eleve.getSexe());
            row.createCell(5).setCellValue(eleve.getClasse());
            row.createCell(6).setCellValue(eleve.getCentre() != null ? eleve.getCentre().getNom() : "-");
            row.createCell(7).setCellValue(eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0);
            row.createCell(8).setCellValue(eleve.getProjet() != null ? eleve.getProjet().getNom() : "Aucun");
        }

        for (int i = 0; i < columns.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=eleves.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/heures")
    public ResponseEntity<byte[]> exportHeures(@RequestParam(required = false) Long centreId) throws IOException {
        List<Eleve> eleves = (centreId != null) ? eleveRepository.findByCentreId(centreId) : eleveRepository.findAll();

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Présences et Heures");

        // Header Row
        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID", "Nom", "Prénom", "Centre", "Heures Effectuées", "Date de début"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
        }

        int rowNum = 1;
        for (Eleve eleve : eleves) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(eleve.getId());
            row.createCell(1).setCellValue(eleve.getNom());
            row.createCell(2).setCellValue(eleve.getPrenom());
            row.createCell(3).setCellValue(eleve.getCentre() != null ? eleve.getCentre().getNom() : "-");
            row.createCell(4).setCellValue(eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0);
            row.createCell(5).setCellValue(eleve.getDateDebutFormation() != null ? eleve.getDateDebutFormation().toString() : "-");
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=heures.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }

    @GetMapping("/transactions")
    public ResponseEntity<byte[]> exportTransactions() throws IOException {
        List<Transaction> transactions = transactionRepository.findAll();

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Transactions");

        Row headerRow = sheet.createRow(0);
        String[] columns = {"ID", "Bénéficiaire", "Montant (FCFA)", "Type", "Description", "Statut", "Date de création"};
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
        }

        int rowNum = 1;
        for (Transaction tx : transactions) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(tx.getId());
            row.createCell(1).setCellValue(tx.getFormateur().getPrenom() + " " + tx.getFormateur().getNom());
            row.createCell(2).setCellValue(tx.getMontant());
            row.createCell(3).setCellValue(tx.getType());
            row.createCell(4).setCellValue(tx.getDescription());
            row.createCell(5).setCellValue(tx.getStatut());
            row.createCell(6).setCellValue(tx.getCreatedAt().toString());
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=transactions.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(out.toByteArray());
    }
}
