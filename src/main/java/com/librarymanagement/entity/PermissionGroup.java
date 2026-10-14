package com.librarymanagement.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "permission_groups")
@Getter
@Setter
@NoArgsConstructor
public class PermissionGroup {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String name;

	private String description;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(//
			name = "group_permissions", //
			joinColumns = //
			@JoinColumn(//
					name = "permission_group_id"//
			), //
			inverseJoinColumns = //
			@JoinColumn(//
					name = "permission_id"//
			)//
	)
	private Set<Permission> permissions = new HashSet<>();
}