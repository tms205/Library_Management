package com.librarymanagement.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.LoginRequest;
import com.librarymanagement.dto.request.RegisterRequest;
import com.librarymanagement.dto.response.LoginResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.PermissionGroup;
import com.librarymanagement.entity.RefreshToken;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ConflictException;
import com.librarymanagement.exception.UnauthorizedException;
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

	private final RefreshTokenService refreshTokenService;

	public AuthService(//
			AccountRepository accountRepository, //
			MemberRepository memberRepository, //
			PasswordEncoder passwordEncoder, //
			JwtService jwtService, //
			EmailVerificationService emailVerificationService, //
			EmailService emailService, //
			PermissionGroupRepository permissionGroupRepository, //
			RefreshTokenService refreshTokenService) {

		this.accountRepository = accountRepository;
		this.memberRepository = memberRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.emailVerificationService = emailVerificationService;
		this.emailService = emailService;
		this.permissionGroupRepository = permissionGroupRepository;
		this.refreshTokenService = refreshTokenService;
	}

	@Transactional
	public void register(RegisterRequest request) {

		if (accountRepository.existsByEmail(request.getEmail())) {
			throw new ConflictException("Email đã tồn tại!");
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

	@Transactional
	public LoginResponse login(LoginRequest request) {

		Account account = accountRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng!"));

		boolean passwordMatches = passwordEncoder.matches(request.getPassword(), account.getPassword());

		if (!passwordMatches) {
			throw new UnauthorizedException("Email hoặc mật khẩu không đúng!");
		}

		if (!account.getEnabled()) {
			throw new UnauthorizedException("Tài khoản chưa được xác minh email!");
		}

		String accessToken = jwtService.generateToken(account);

		String refreshToken = refreshTokenService//
				.createRefreshToken(account)//
				.getToken();

		return new LoginResponse(//
				accessToken, //
				refreshToken, //
				"Bearer");
	}

	@Transactional
	public void changePassword(String email, String oldPassword, String newPassword) {

		Account account = accountRepository.findByEmail(email)
				.orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản!"));

		if (!passwordEncoder.matches(oldPassword, account.getPassword())) {

			throw new BadRequestException("Mật khẩu hiện tại không chính xác!");
		}

		if (passwordEncoder.matches(newPassword, account.getPassword())) {

			throw new BadRequestException("Mật khẩu mới không được trùng mật khẩu hiện tại!");
		}

		account.setPassword(passwordEncoder.encode(newPassword));

		accountRepository.save(account);
	}

	@Transactional(readOnly = true)
	public LoginResponse refreshToken(String token) {

		RefreshToken refreshToken = //
				refreshTokenService.verifyRefreshToken(token);

		Account account = refreshToken.getAccount();

		String newAccessToken = //
				jwtService.generateToken(account);

		return new LoginResponse(//
				newAccessToken, //
				refreshToken.getToken(), //
				"Bearer");
	}

	@Transactional
	public void logout(String email) {

		Account account = accountRepository.findByEmail(email)//
				.orElseThrow(() -> new UnauthorizedException(//
						"Không tìm thấy tài khoản!"));//

		refreshTokenService.deleteByAccountId(account.getId());
	}
}