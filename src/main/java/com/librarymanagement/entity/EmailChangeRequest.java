package com.librarymanagement.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "email_change_requests")
@Getter
@Setter
@NoArgsConstructor
public class EmailChangeRequest {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "new_email", nullable = false)
	private String newEmail;

	@Column(nullable = false, length = 6)
	private String code;

	@Column(name = "expires_at", nullable = false)
	private LocalDateTime expiresAt;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "account_id", nullable = false, unique = true)

	private Account account;

}
