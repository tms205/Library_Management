package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.PermissionGroup;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Long> {

	Optional<PermissionGroup> findByName(String name);

	boolean existsByName(String name);

	boolean existsByNameAndIdNot(String name, Long id);

	@Query("SELECT COUNT(a) FROM Account a JOIN a.permissionGroups pg WHERE pg.id = :groupId")
	long countAccountsByGroupId(@Param("groupId") Long groupId);
}
