package com.librarymanagement.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
public class Account {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String email;

	@Column(nullable = false)
	private String password;

	@Enumerated(EnumType.STRING)
	@Column(nullable = true)
	private Role role;

	@Column(nullable = false)
	private Boolean enabled;

	// kh xoa role chi them
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "account_permission_groups", //
			joinColumns = @JoinColumn(name = "account_id"), ///
			inverseJoinColumns = @JoinColumn(name = "permission_group_id"))
	private Set<PermissionGroup> permissionGroups = new HashSet<>();

}
