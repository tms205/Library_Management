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

	private final SystemConfigService systemConfigService;

	public AuthService(//
			AccountRepository accountRepository, //
			MemberRepository memberRepository, //
			PasswordEncoder passwordEncoder, //
			JwtService jwtService, //
			EmailVerificationService emailVerificationService, //
			EmailService emailService, //
			PermissionGroupRepository permissionGroupRepository, //
			RefreshTokenService refreshTokenService, //
			SystemConfigService systemConfigService//
	) {

		this.accountRepository = accountRepository;
		this.memberRepository = memberRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;

		this.emailVerificationService = emailVerificationService;
		this.emailService = emailService;

		this.permissionGroupRepository = permissionGroupRepository;

		this.refreshTokenService = refreshTokenService;

		this.systemConfigService = systemConfigService;
	}

	// =========================
	// REGISTER
	// =========================

	@Transactional
	public void register(RegisterRequest request) {

		// Neu dang bao tri
		// khong cho tao tai khoan moi
		if (systemConfigService.isMaintenanceMode()) {

			throw new BadRequestException("Hệ thống đang bảo trì. " + "Hiện tại không thể đăng ký tài khoản mới!");
		}

		if (accountRepository.existsByEmail(request.getEmail())) {

			throw new ConflictException("Email đã tồn tại!");
		}

		Account account = //
				new Account();

		account.setEmail(request.getEmail());

		account.setPassword(passwordEncoder.encode(request.getPassword()));

		/*
		 * Giữ Role.USER tạm thời để code cũ chưa bị ảnh hưởng.
		 */
		account.setRole(Role.USER);

		account.setEnabled(false);

		/*
		 * Tìm USER_GROUP mặc định cho tài khoản mới.
		 */
		PermissionGroup userGroup = //
				permissionGroupRepository.findByName("USER_GROUP").orElseThrow(() -> //
				new IllegalStateException("Không tìm thấy USER_GROUP trong database!"));

		account.getPermissionGroups().add(userGroup);

		accountRepository.save(account);

		Member member = //
				new Member();

		member.setFullName(request.getFullName());

		member.setDateOfBirth(request.getDateOfBirth());

		member.setPhone(request.getPhone());

		member.setAddress(request.getAddress());

		member.setAccount(account);

		memberRepository.save(member);

		String token = //
				emailVerificationService.createVerificationToken(account);

		emailService.sendVerificationEmail(account.getEmail(), token);
	}

	// =========================
	// LOGIN
	// =========================

	@Transactional
	public LoginResponse login(LoginRequest request) {

		Account account = //
				accountRepository.findByEmail(request.getEmail()).orElseThrow(() -> //
				new UnauthorizedException("Email hoặc mật khẩu không đúng!"));

		boolean passwordMatches = //
				passwordEncoder.matches(request.getPassword(), account.getPassword());

		if (!passwordMatches) {

			throw new UnauthorizedException("Email hoặc mật khẩu không đúng!");
		}

		if (!account.getEnabled()) {

			throw new UnauthorizedException("Tài khoản đã bị khóa, vui lòng xác thực tài khoản email"//
					+ "hoặc liên hệ Admin để được giải đáp");
		}

		// =========================
		// MAINTENANCE
		// =========================

		if (systemConfigService.isMaintenanceMode()) {

			boolean isAdmin = //
					isAdminGroup(account);

			if (!isAdmin) {

				throw new UnauthorizedException("Hệ thống đang bảo trì. " + "Chỉ quản trị viên được phép đăng nhập!");
			}
		}

		String accessToken = //
				jwtService.generateToken(account);

		String refreshToken = //
				refreshTokenService.createRefreshToken(account).getToken();

		return new LoginResponse(accessToken, refreshToken, "Bearer");
	}

	// =========================
	// CHANGE PASSWORD
	// =========================

	@Transactional
	public void changePassword(String email, String oldPassword, String newPassword) {

		Account account = //
				accountRepository.findByEmail(email).orElseThrow(() -> //
				new BadRequestException("Không tìm thấy tài khoản!"));

		if (!passwordEncoder.matches(oldPassword, account.getPassword())) {

			throw new BadRequestException("Mật khẩu hiện tại không chính xác!");
		}

		if (passwordEncoder.matches(newPassword, account.getPassword())) {

			throw new BadRequestException("Mật khẩu mới không được trùng mật khẩu hiện tại!");
		}

		account.setPassword(passwordEncoder.encode(newPassword));

		accountRepository.save(account);
	}

	// =========================
	// REFRESH TOKEN
	// =========================

	@Transactional(readOnly = true)
	public LoginResponse refreshToken(String token) {

		RefreshToken refreshToken = //
				refreshTokenService.verifyRefreshToken(token);

		Account account = //
				refreshToken.getAccount();

		// Không cấp mới access token nếu tài khoản đã bị khóa
		if (Boolean.FALSE.equals(account.getEnabled())) {
			throw new UnauthorizedException(
					"Tài khoản của bạn đã bị khóa! Vui lòng liên hệ thủ thư/Admin để được hỗ trợ.");
		}

		if (systemConfigService.isMaintenanceMode()) {

			if (!isAdminGroup(account)) {

				throw new UnauthorizedException("Hệ thống đang bảo trì. " + "Vui lòng thử lại sau!");
			}
		}

		String newAccessToken = //
				jwtService.generateToken(account);

		return new LoginResponse(newAccessToken, refreshToken.getToken(), "Bearer");
	}

	// =========================
	// LOGOUT
	// =========================

	@Transactional
	public void logout(String email) {

		Account account = //
				accountRepository.findByEmail(email).orElseThrow(() -> //
				new UnauthorizedException("Không tìm thấy tài khoản!"));

		refreshTokenService.deleteByAccountId(account.getId());
	}

	// =========================
	// CHECK ADMIN GROUP
	// =========================

	private boolean isAdminGroup(Account account) {

		return account.getPermissionGroups().stream().anyMatch(group -> //
		"ADMIN_GROUP".equals(group.getName())//
		);
	}
}