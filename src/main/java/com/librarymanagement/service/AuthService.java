package com.librarymanagement.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.LoginRequest;
import com.librarymanagement.dto.LoginResponse;
import com.librarymanagement.dto.RegisterRequest;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.PermissionGroup;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.AccountNotVerifiedException;
import com.librarymanagement.exception.ChangePasswordException;
import com.librarymanagement.exception.EmailAlreadyExistsException;
import com.librarymanagement.exception.InvalidCredentialsException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.repository.PermissionGroupRepository;
import com.librarymanagement.security.JwtService;

@Service
public class AuthService {

	private final AccountRepository accountRepository;
	private final MemberRepository memberRepository;
	private final PermissionGroupRepository permissionGroupRepository;

	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	private final EmailVerificationService emailVerificationService;
	private final EmailService emailService;

	public AuthService(AccountRepository accountRepository, MemberRepository memberRepository,
			PasswordEncoder passwordEncoder, JwtService jwtService, EmailVerificationService emailVerificationService,
			EmailService emailService, PermissionGroupRepository permissionGroupRepository) {

		this.accountRepository = accountRepository;
		this.memberRepository = memberRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.emailVerificationService = emailVerificationService;
		this.emailService = emailService;
		this.permissionGroupRepository = permissionGroupRepository;
	}

	@Transactional
	public void register(RegisterRequest request) {

		if (accountRepository.existsByEmail(request.getEmail())) {
			throw new EmailAlreadyExistsException("Email đã tồn tại!");
		}

		Account account = new Account();

		account.setEmail(request.getEmail());

		account.setPassword(passwordEncoder.encode(request.getPassword()));

		/*
		 * Giữ Role.USER tạm thời để code cũ chưa bị ảnh hưởng.
		 */
		account.setRole(Role.USER);

		account.setEnabled(false);

		/*
		 * Tìm nhóm quyền mặc định dành cho user mới.
		 */
		PermissionGroup userGroup = permissionGroupRepository.findByName("USER_GROUP").orElseThrow(() -> //
		new IllegalStateException(//
				"Không tìm thấy USER_GROUP trong database!")//
		);

		/*
		 * Gán account mới vào USER_GROUP.
		 */
		account.getPermissionGroups().add(userGroup);

		accountRepository.save(account);

		Member member = new Member();

		member.setFullName(request.getFullName());

		member.setDateOfBirth(request.getDateOfBirth());

		member.setPhone(request.getPhone());

		member.setAddress(request.getAddress());

		member.setAccount(account);

		memberRepository.save(member);

		String token = emailVerificationService.createVerificationToken(account);

		emailService.sendVerificationEmail(account.getEmail(), token);
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {

		Account account = accountRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new InvalidCredentialsException("Email hoặc mật khẩu không đúng!"));

		boolean passwordMatches = passwordEncoder.matches(request.getPassword(), account.getPassword());

		if (!passwordMatches) {
			throw new InvalidCredentialsException("Email hoặc mật khẩu không đúng!");
		}

		if (!account.getEnabled()) {
			throw new AccountNotVerifiedException("Tài khoản chưa được xác minh email!");
		}

		String token = jwtService.generateToken(account);

		return new LoginResponse(token, "Bearer");
	}

	@Transactional
	public void changePassword(String email, String oldPassword, String newPassword) {

		Account account = accountRepository.findByEmail(email)
				.orElseThrow(() -> new ChangePasswordException("Không tìm thấy tài khoản!"));

		if (!passwordEncoder.matches(oldPassword, account.getPassword())) {

			throw new ChangePasswordException("Mật khẩu hiện tại không chính xác!");
		}

		if (passwordEncoder.matches(newPassword, account.getPassword())) {

			throw new ChangePasswordException("Mật khẩu mới không được trùng mật khẩu hiện tại!");
		}

		account.setPassword(passwordEncoder.encode(newPassword));

		accountRepository.save(account);
	}
}