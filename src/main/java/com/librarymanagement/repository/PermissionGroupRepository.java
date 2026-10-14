package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.PermissionGroup;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Long> {
	Optional<PermissionGroup> findByName(String name);
}
