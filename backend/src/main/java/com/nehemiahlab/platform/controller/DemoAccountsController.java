package com.nehemiahlab.platform.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Liste publique des comptes démo (profils local / demo uniquement). */
@RestController
@Profile({"local", "demo"})
@RequestMapping("/site")
public class DemoAccountsController {

    @GetMapping("/demo-comptes")
    public ResponseEntity<Map<String, Object>> demoComptes() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("motDePassePersonnel", "password123");
        body.put("motDePasseParent", "password123");
        body.put("ongletPersonnel", "Personnel — connexion par email");
        body.put("ongletParent", "Espace parent — matricule enfant + mot de passe");

        body.put("directeur", List.of(Map.of(
                "role", "DIRECTEUR",
                "email", "director@nehemiahlab.com",
                "acces", "Plateforme complète"
        )));

        body.put("responsablesCluster", List.of(
                compte("RESPONSABLE_CLUSTER", "resp1@ska.tg", "Cluster Lomé Est"),
                compte("RESPONSABLE_CLUSTER", "resp2@ska.tg", "Cluster Maritime Ouest"),
                compte("RESPONSABLE_CLUSTER", "resp3@ska.tg", "Cluster Kpalimé"),
                compte("RESPONSABLE_CLUSTER", "resp4@ska.tg", "Cluster Atakpamé"),
                compte("RESPONSABLE_CLUSTER", "resp5@ska.tg", "Cluster Sokodé"),
                compte("RESPONSABLE_CLUSTER", "resp6@ska.tg", "Cluster Centrale Est"),
                compte("RESPONSABLE_CLUSTER", "resp7@ska.tg", "Cluster Kara Ville"),
                compte("RESPONSABLE_CLUSTER", "resp8@ska.tg", "Cluster Kara Nord"),
                compte("RESPONSABLE_CLUSTER", "resp9@ska.tg", "Cluster Dapaong"),
                compte("RESPONSABLE_CLUSTER", "resp10@ska.tg", "Cluster Mango")
        ));

        body.put("coordinateurs", noteListe(
                "coord1@ska.tg … coord50@ska.tg — 1 centre chacun (ex. coord1 → SKA Lomé Bè)"
        ));
        body.put("formateurs", noteListe(
                "form1@ska.tg … form20@ska.tg — 2 par cluster, plusieurs centres possibles"
        ));

        body.put("comptesDirecteur", List.of(
                compte("COMPTABLE", "compta@ska.tg", "Finances / transactions"),
                compte("STAFF_NEHEMIAH", "staff@ska.tg", "Staff Nehemiah Lab"),
                compte("ANIMATEUR", "animateur@ska.tg", "Animateur CDEJ"),
                compte("BENEVOLE", "benevole@ska.tg", "Bénévole CDEJ"),
                compte("PARTICIPANT", "participant@ska.tg", "Participant CDEJ")
        ));

        body.put("parents", List.of(
                parent("26SKA0001", "1er élève — SKA Lomé Bè"),
                parent("26SKA0002", "2e élève — SKA Lomé Bè"),
                parent("26SKA0003", "3e élève — SKA Lomé Bè"),
                parent("26SKA0004", "4e élève — SKA Lomé Bè"),
                parent("26SKA0005", "5e élève — SKA Lomé Bè")
        ));

        body.put("exemplesRapides", List.of(
                Map.of("role", "Directeur", "connexion", "director@nehemiahlab.com / password123"),
                Map.of("role", "Responsable cluster", "connexion", "resp1@ska.tg / password123"),
                Map.of("role", "Coordinateur", "connexion", "coord1@ska.tg / password123"),
                Map.of("role", "Formateur", "connexion", "form1@ska.tg / password123"),
                Map.of("role", "Comptable", "connexion", "compta@ska.tg / password123"),
                Map.of("role", "Parent", "connexion", "Matricule 26SKA0001 / password123 (onglet Espace parent)")
        ));

        return ResponseEntity.ok(body);
    }

    private static Map<String, String> compte(String role, String email, String note) {
        return Map.of("role", role, "email", email, "note", note);
    }

    private static Map<String, String> parent(String matricule, String note) {
        return Map.of("matricule", matricule, "note", note);
    }

    private static Map<String, String> noteListe(String texte) {
        return Map.of("pattern", texte, "motDePasse", "password123");
    }
}
