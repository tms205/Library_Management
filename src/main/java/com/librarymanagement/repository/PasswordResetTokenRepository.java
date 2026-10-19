package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

	Optional<PasswordResetToken> findByAccount(Account account);

	Optional<PasswordResetToken> findByAccount_IdAndOtp(Long accountId, String otp);

	void deleteByAccount_Id(Long accountId);
}
