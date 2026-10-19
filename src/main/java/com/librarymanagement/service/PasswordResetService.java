package com.librarymanagement.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.PasswordResetToken;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.PasswordResetTokenRepository;

@Service
public class PasswordResetService {

	private final AccountRepository accountRepository;
	private final PasswordResetTokenRepository tokenRepository;
	private final EmailService emailService;
	private final PasswordEncoder passwordEncoder;

	private final SecureRandom secureRandom = new SecureRandom();

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

		Account account = accountRepository.findByEmail(email)//
				.orElseThrow(() -> //
				new ResourceNotFoundException("Không tìm thấy tài khoản với email này!"));

		String otp = generateOtp();

		PasswordResetToken resetToken = tokenRepository.findByAccount(account)//
				.orElse(new PasswordResetToken());

		resetToken.setOtp(otp);

		resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(5));

		resetToken.setUsed(false);

		resetToken.setAccount(account);

		tokenRepository.save(resetToken);

		emailService.sendPasswordResetOtp(account.getEmail(), otp);
	}

	@Transactional
	public void resetPassword(String email, String otp, String newPassword) {

		Account account = accountRepository.findByEmail(email)//
				.orElseThrow(() -> //
				new BadRequestException("Email hoặc OTP không chính xác!"));

		PasswordResetToken resetToken = tokenRepository//
				.findByAccount_IdAndOtp(account.getId(), otp).orElseThrow(() -> //
				new BadRequestException("OTP không chính xác!"));

		if (resetToken.isUsed()) {
			throw new BadRequestException("OTP đã được sử dụng!");
		}

		if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BadRequestException(//
					"OTP đã hết hạn, vui lòng yêu cầu mã mới!");
		}

		account.setPassword(//
				passwordEncoder.encode(newPassword));

		accountRepository.save(account);

		resetToken.setUsed(true);

		tokenRepository.save(resetToken);
	}

	private String generateOtp() {

		int number = secureRandom.nextInt(1000000);

		return String.format("%06d", number);
	}
}