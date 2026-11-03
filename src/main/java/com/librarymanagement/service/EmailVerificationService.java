package com.librarymanagement.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.EmailVerificationToken;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.EmailVerificationTokenRepository;

@Service
public class EmailVerificationService {

	private final AccountRepository accountRepository;
	private final EmailVerificationTokenRepository tokenRepository;
	private final SecureRandom secureRandom = new SecureRandom();

	public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
			AccountRepository accountRepository) {
		this.tokenRepository = tokenRepository;
		this.accountRepository = accountRepository;
	}

	@Transactional
	public EmailVerificationToken createVerificationToken(Account account) {
		String token = UUID.randomUUID().toString();// sinh mã ngẫu nhiên cho link web
		String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));// sinh mã 6 so cho app mobile

		EmailVerificationToken verificationToken = tokenRepository.findByAccount(account)
				.orElse(new EmailVerificationToken());

		verificationToken.setToken(token);
		verificationToken.setOtpCode(otpCode);
		verificationToken.setExpiresAt(LocalDateTime.now().plusMinutes(15));
		verificationToken.setAccount(account);

		return tokenRepository.save(verificationToken);
	}

	@Transactional
	public void verifyEmail(String token) {
		EmailVerificationToken verificationToken = tokenRepository.findByToken(token)
				.orElseThrow(() -> new BadRequestException("Token xác minh không hợp lệ!"));

		if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BadRequestException("Token xác minh đã hết hạn!");
		}

		Account account = verificationToken.getAccount();
		account.setEnabled(true);
		accountRepository.save(account);
		tokenRepository.delete(verificationToken);
	}

	@Transactional
	public void verifyEmailOtp(String email, String otp) {
		Account account = accountRepository.findByEmail(email)
				.orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email này!"));

		if (Boolean.TRUE.equals(account.getEnabled())) {
			throw new BadRequestException("Tài khoản này đã được kích hoạt thành công trước đó rồi!");
		}

		EmailVerificationToken verificationToken = tokenRepository.findByAccount(account)
				.orElseThrow(() -> new BadRequestException("Không tìm thấy mã xác minh cho tài khoản này!"));

		if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BadRequestException("Mã xác minh đã hết hạn! Vui lòng yêu cầu gửi lại mã mới.");
		}

		if (verificationToken.getOtpCode() == null || !verificationToken.getOtpCode().equals(otp.trim())) {
			throw new BadRequestException("Mã xác minh OTP không chính xác!");
		}

		Account accountToEnable = verificationToken.getAccount();
		accountToEnable.setEnabled(true);
		accountRepository.save(accountToEnable);
		tokenRepository.delete(verificationToken);
	}
}
