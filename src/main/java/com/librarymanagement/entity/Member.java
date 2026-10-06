package com.librarymanagement.entity;

import java.time.LocalDate;

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
@Table(name = "members")
@Getter
@Setter
@NoArgsConstructor
public class Member {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String fullName;

	@Column(nullable = false)
	private LocalDate dateOfBirth;

	@Column(nullable = false, length = 20)
	private String phone;

	@Column(nullable = false, length = 255)
	private String address;

	@OneToOne(fetch = FetchType.LAZY, // khi lấy member chưa cần lấy toàn bộ account ngay, khi nào thực sự
										// cần thì hibernate mới lấy
			optional = false// member bắt buộc phải có account không được member->account = null ->
							// không được
	)
	@JoinColumn(name = "account_id", nullable = false, unique = true)
	private Account account;
}
