package com.librarymanagement.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.EmailVerificationToken;
import com.librarymanagement.exception.VerificationTokenException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.EmailVerificationTokenRepository;

@Service
public class EmailVerificationService {

	private final AccountRepository accountRepository;
	private final EmailVerificationTokenRepository tokenRepository;

	public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
			AccountRepository accountRepository) {
		this.tokenRepository = tokenRepository;
		this.accountRepository = accountRepository;
	}

	public String createVerificationToken(Account account) {
		String token = UUID.randomUUID().toString();// sinh mã ngẫu nhiên
		EmailVerificationToken verificationToken = new EmailVerificationToken();

		verificationToken.setToken(token);

		// set hạn của token 15p
		verificationToken.setExpiresAt(LocalDateTime.now().plusMinutes(15));

		// gắn token với account
		verificationToken.setAccount(account);

		// lưu
		tokenRepository.save(verificationToken);

		return token;
	}

	@Transactional
	public void verifyEmail(String token) {
		EmailVerificationToken verificationToken = tokenRepository.findByToken(token)
				.orElseThrow(() -> new VerificationTokenException("Token xác minh không hợp lệ!"));

		if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new VerificationTokenException("Token xác minh đã hết hạn!");
		}

		// xác minh xong xóa token đi
		Account account = verificationToken.getAccount();
		account.setEnabled(true);
		accountRepository.save(account);
		tokenRepository.delete(verificationToken);
	}
}
