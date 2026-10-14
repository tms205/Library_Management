package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.SystemConfig;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {

	Optional<SystemConfig> findFirstByOrderByIdAsc();
}
