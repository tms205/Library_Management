package com.librarymanagement.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.Permission;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

	Optional<Permission> findByName(String name);

	List<Permission> findByNameIn(Collection<String> names);

	List<Permission> findByIdIn(Collection<Long> ids);

	List<Permission> findAllByOrderByNameAsc();
}
