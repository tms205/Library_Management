package com.librarymanagement.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.PasswordResetToken;
import com.librarymanagement.exception.PasswordResetException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.PasswordResetTokenRepository;

@Service
public class PasswordResetService {

	private final AccountRepository accountRepository;
	private final PasswordResetTokenRepository tokenRepository;
	private final EmailService emailService;

	private final PasswordEncoder passwordEncoder;

	public PasswordResetService(AccountRepository accountRepository, //
			PasswordResetTokenRepository tokenRepository, //
			EmailService emailService, //
			PasswordEncoder passwordEncoder//
	) {

		this.accountRepository = accountRepository;
		this.tokenRepository = tokenRepository;
		this.emailService = emailService;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public void forgotPassword(String email) {
		Account account = accountRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này!"));

		String token = UUID.randomUUID().toString();

		PasswordResetToken resetToken = tokenRepository.findByAccount(account).orElse(new PasswordResetToken());

		resetToken.setToken(token);

		resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(15));

		resetToken.setAccount(account);

		tokenRepository.save(resetToken);

		emailService.sendPasswordResetEmail(account.getEmail(), token);
	}

	@Transactional
	public void resetPassword(String token, String newPassword) {
		PasswordResetToken resetToken = tokenRepository.findByToken(token)
				.orElseThrow(() -> new PasswordResetException("Token reset password không hợp lệ!"));

		if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new PasswordResetException("Token reset password đã hết hạn!");
		}

		Account account = resetToken.getAccount();

		account.setPassword(passwordEncoder.encode(newPassword));

		accountRepository.save(account);
		tokenRepository.delete(resetToken);
	}
}
