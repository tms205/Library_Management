package com.librarymanagement.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.EmailChangeRequest;
import com.librarymanagement.exception.ChangeEmailException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.EmailChangeRequestRepository;

@Service
public class EmailChangeService {

	private final AccountRepository accountRepository;
	private final EmailChangeRequestRepository emailChangeRequestRepository;
	private final EmailService emailService;

	private final SecureRandom secureRandom = new SecureRandom();

	public EmailChangeService(AccountRepository accountRepository, //
			EmailChangeRequestRepository emailChangeRequestRepository, //
			EmailService emailService//
	) {
		this.accountRepository = accountRepository;
		this.emailChangeRequestRepository = emailChangeRequestRepository;
		this.emailService = emailService;
	}

	@Transactional
	public void requestChangeEmail(String currentEmail, String newEmail) {
		Account account = accountRepository.findByEmail(currentEmail)
				.orElseThrow(() -> new ChangeEmailException("Không tìm thấy tài khoản!"));

		if (account.getEmail().equalsIgnoreCase(newEmail)) {
			throw new ChangeEmailException("Email mới không được trùng email hiện tại!");
		}

		if (accountRepository.existsByEmail(newEmail)) {
			throw new ChangeEmailException("Email này đã được sử dụng!");
		}

		String code = String.format("%06d", // random ra 123 thif %06 tu render 000123 du 6 so
				secureRandom.nextInt(1_000_000));

		EmailChangeRequest changeRequest = emailChangeRequestRepository.findByAccount(account)
				.orElse(new EmailChangeRequest());

		changeRequest.setAccount(account);
		changeRequest.setNewEmail(newEmail);
		changeRequest.setCode(code);

		changeRequest.setExpiresAt(LocalDateTime.now().plusMinutes(15));

		emailChangeRequestRepository.save(changeRequest);

		emailService.sendChangeEmailCode(newEmail, code);

	}

	@Transactional
	public void confirmChangeEmail(String currentEmail, String code) {
		Account account = accountRepository.findByEmail(currentEmail)
				.orElseThrow(() -> new ChangeEmailException("Không tìm thấy tài khoản!"));

		EmailChangeRequest changeRequest = emailChangeRequestRepository.findByAccount(account)
				.orElseThrow(() -> new ChangeEmailException("Bạn chưa yêu cầu thay đổi email!"));

		if (changeRequest.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new ChangeEmailException("Mã xác minh đã hết hạn!");
		}

		if (accountRepository.existsByEmail(changeRequest.getNewEmail())) {
			throw new ChangeEmailException("Email này đã được sử dụng!");
		}

		account.setEmail(changeRequest.getNewEmail());

		emailChangeRequestRepository.delete(changeRequest);

	}

}
