package com.librarymanagement.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.LoginRequest;
import com.librarymanagement.dto.LoginResponse;
import com.librarymanagement.dto.RegisterRequest;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.AccountNotVerifiedException;
import com.librarymanagement.exception.ChangePasswordException;
import com.librarymanagement.exception.InvalidCredentialsException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.security.JwtService;

@Service
public class AuthService {
	private final AccountRepository accountRepository;
	private final MemberRepository memberRepository;

	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	private final EmailVerificationService emailVerificationService;
	private final EmailService emailService;

	public AuthService(AccountRepository accountRepository, // kho lưu trữ account
			MemberRepository memberRepository, // kho lưu trữ member
			PasswordEncoder passwordEncoder, // gọi thằng hashpass
			JwtService jwtService, //
			EmailVerificationService emailVerificationService, //
			EmailService emailService) {// xác thực tìa khoản
		// TODO Auto-generated constructor stub
		this.accountRepository = accountRepository;
		this.memberRepository = memberRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.emailVerificationService = emailVerificationService;
		this.emailService = emailService;
	}

	@Transactional // dùng cái này vì lỡ tạo được account mà k tạo được member thì
					// rollback lại
	public void register(RegisterRequest request) {
		if (accountRepository.existsByEmail(request.getEmail())) {
			throw new RuntimeException("Email đã tồn tại!");
		}

		Account account = new Account();

		account.setEmail(request.getEmail());
		account.setPassword(passwordEncoder.encode(request.getPassword()));
		account.setRole(Role.USER);
		account.setEnabled(false);

		accountRepository.save(account);

		Member member = new Member();
		member.setFullName(request.getFullName());
		member.setDateOfBirth(request.getDateOfBirth());
		member.setPhone(request.getPhone());
		member.setAddress(request.getAddress());
		member.setAccount(account);

		memberRepository.save(member);
		// tạo verification token
		String token = emailVerificationService.createVerificationToken(account);

		emailService.sendVerificationEmail(account.getEmail(), token);

	}

	public LoginResponse login(LoginRequest request) {
		Account account = accountRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new InvalidCredentialsException("Email hoặc mật khẩu không đúng!")
				// bên package exception, có class invalidcredentialsexception á
				// hay dùng email không tồn tại
				// nhưng để như này thì ngta kh dò được email trong hethong

				);
		boolean passwordMatches = passwordEncoder.matches(request.getPassword(), account.getPassword());

		if (!passwordMatches) {
			throw new InvalidCredentialsException("Email hoặc mật khẩu không đúng!");
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
				.orElseThrow(() -> new ChangePasswordException("Không tìm thấy tài khoản!"));

		if (!passwordEncoder.matches(oldPassword, account.getPassword())) {
			throw new ChangePasswordException("Current password is incorrect!");
		}

		if (passwordEncoder.matches(newPassword, account.getPassword())) {
			throw new ChangePasswordException("Mật khẩu mới không được trùng mật khẩu hiện tại!");
		}

		account.setPassword(passwordEncoder.encode(newPassword));

		accountRepository.save(account);
	}

}
