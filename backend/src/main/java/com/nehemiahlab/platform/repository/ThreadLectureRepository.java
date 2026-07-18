package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ThreadLecture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ThreadLectureRepository extends JpaRepository<ThreadLecture, Long> {
    Optional<ThreadLecture> findByThreadTypeAndThreadKeyAndUserId(String threadType, String threadKey, Long userId);
    List<ThreadLecture> findByThreadTypeAndThreadKey(String threadType, String threadKey);
}
