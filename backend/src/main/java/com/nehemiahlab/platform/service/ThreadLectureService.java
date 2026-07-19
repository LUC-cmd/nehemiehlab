package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.ThreadLecture;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.ThreadLectureRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Suit qui a ouvert un fil de discussion et quand, pour afficher (côté expéditeur
 * uniquement) qui a déjà lu chaque message : un lecteur "a lu" un message si son
 * dernier accès au fil est postérieur à la création du message.
 */
@Service
public class ThreadLectureService {

    @Autowired
    private ThreadLectureRepository threadLectureRepository;

    @Autowired
    private UserRepository userRepository;

    /** Dernier acces de l'utilisateur a ce fil, ou null s'il ne l'a jamais ouvert. */
    public java.time.LocalDateTime getDernierAcces(String threadType, String threadKey, Long userId) {
        return threadLectureRepository.findByThreadTypeAndThreadKeyAndUserId(threadType, threadKey, userId)
                .map(ThreadLecture::getDernierAcces)
                .orElse(null);
    }

    @Transactional
    public void marquerLu(String threadType, String threadKey, User user) {
        ThreadLecture lecture = threadLectureRepository
                .findByThreadTypeAndThreadKeyAndUserId(threadType, threadKey, user.getId())
                .orElseGet(() -> ThreadLecture.builder()
                        .threadType(threadType)
                        .threadKey(threadKey)
                        .userId(user.getId())
                        .build());
        lecture.setDernierAcces(LocalDateTime.now());
        threadLectureRepository.save(lecture);
    }

    public List<Map<String, Object>> getLecteurs(String threadType, String threadKey) {
        List<ThreadLecture> rows = threadLectureRepository.findByThreadTypeAndThreadKey(threadType, threadKey);
        if (rows.isEmpty()) return new ArrayList<>();
        // On recupere tous les utilisateurs concernes en une seule requete (au lieu d'un
        // findById par ligne dans la boucle) : cet endpoint est interroge toutes les 8
        // secondes par chaque fil de discussion ouvert, un N+1 ici se repete en continu.
        List<Long> userIds = rows.stream().map(ThreadLecture::getUserId).distinct().toList();
        Map<Long, User> usersById = new HashMap<>();
        for (User u : userRepository.findAllById(userIds)) {
            usersById.put(u.getId(), u);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (ThreadLecture r : rows) {
            User u = usersById.get(r.getUserId());
            if (u == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("userId", u.getId());
            m.put("prenom", u.getPrenom());
            m.put("nom", u.getNom());
            m.put("avatar", u.getAvatar());
            m.put("dernierAcces", r.getDernierAcces());
            result.add(m);
        }
        return result;
    }
}
