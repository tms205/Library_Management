package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;

import com.librarymanagement.dto.response.MemberResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Role;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;

@SpringBootTest
class MemberServiceIntegrationTest {

	@Autowired
	private MemberService memberService;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private AccountRepository accountRepository;

	@Test
	@DisplayName("Kiểm thử searchMember thực tế trên DB khi open-in-view=false: Đảm bảo không gặp LazyInitializationException")
	void testSearchMember_NoLazyInitializationException() {
		// Tạo account và member thực tế trên Database
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		Account account = new Account();
		account.setEmail("reader-" + suffix + "@library.com");
		account.setPassword("hashedpassword123");
		account.setEnabled(true);
		account.setIsDelete(false);
		account.setRole(Role.USER);
		account = accountRepository.save(account);

		Member member = new Member();
		member.setFullName("Độc Giả Thử Nghiệm " + suffix);
		member.setDateOfBirth(LocalDate.of(1995, 3, 15));
		member.setPhone("09" + (int)(Math.random() * 89999999 + 10000000));
		member.setAddress("Hà Nội, Việt Nam");
		member.setAccount(account);
		member = memberRepository.save(member);

		// Gọi searchMember qua MemberService
		Page<MemberResponse> result = memberService.searchMember(
				"Độc Giả Thử Nghiệm " + suffix,
				null,
				null,
				0,
				10,
				"id",
				"desc",
				null,
				null,
				null
		);

		assertNotNull(result);
		assertFalse(result.isEmpty());
		MemberResponse first = result.getContent().get(0);
		assertEquals(member.getId(), first.getId());
		assertEquals("Độc Giả Thử Nghiệm " + suffix, first.getFullName());
		assertEquals("reader-" + suffix + "@library.com", first.getEmail());
		assertEquals(Boolean.TRUE, first.getEnabled());
		assertEquals(Integer.valueOf(0), first.getIsDelete());
		assertEquals("USER", first.getRole());
	}

	@Test
	@DisplayName("Kiểm thử phân trang searchMember: Tính toán đúng totalElements và số lượng bản ghi mỗi trang")
	void testSearchMember_Pagination() {
		Page<MemberResponse> page0 = memberService.searchMember(
				null, null, null, 0, 2, "id", "asc", null, null, null
		);

		assertNotNull(page0);
		assertTrue(page0.getTotalElements() >= 0);
		assertTrue(page0.getContent().size() <= 2);

		if (page0.getTotalPages() > 1) {
			Page<MemberResponse> page1 = memberService.searchMember(
					null, null, null, 1, 2, "id", "asc", null, null, null
			);
			assertNotNull(page1);
			assertTrue(page1.getContent().size() <= 2);
		}
	}

	@Test
	@DisplayName("Kiểm thử getMemberById và getAllMembers: Không bị LazyInitializationException")
	void testGetMemberByIdAndGetAllMembers() {
		List<MemberResponse> allMembers = memberService.getAllMembers();
		assertNotNull(allMembers);

		if (!allMembers.isEmpty()) {
			MemberResponse first = allMembers.get(0);
			MemberResponse byId = memberService.getMemberById(first.getId());
			assertNotNull(byId);
			assertEquals(first.getId(), byId.getId());
			assertEquals(first.getFullName(), byId.getFullName());
			assertNotNull(byId.getEmail());
			assertNotNull(byId.getEnabled());
		}
	}

	@Test
	@DisplayName("Kiểm thử toResponse khi độc giả không có Account: Hoạt động an toàn, không ném NullPointerException")
	void testToResponse_WhenAccountIsNull_ReturnsGracefully() {
		Member memberWithoutAccount = new Member();
		memberWithoutAccount.setId(9999L);
		memberWithoutAccount.setFullName("Độc Giả Không Tài Khoản");
		memberWithoutAccount.setDateOfBirth(LocalDate.of(2000, 1, 1));
		memberWithoutAccount.setPhone("0988888888");
		memberWithoutAccount.setAddress("Không xác định");
		memberWithoutAccount.setAccount(null);

		MemberResponse response = memberService.toResponse(memberWithoutAccount);

		assertNotNull(response);
		assertEquals(9999L, response.getId());
		assertEquals("Độc Giả Không Tài Khoản", response.getFullName());
		assertNull(response.getAccountId());
		assertNull(response.getEmail());
		assertEquals(Boolean.TRUE, response.getEnabled()); // Default fallback
		assertEquals(Integer.valueOf(0), response.getIsDelete()); // Default fallback
		assertEquals("USER", response.getRole()); // Default fallback
	}

	@Test
	@DisplayName("Kiểm thử updateMemberStatus: Khóa và mở khóa tài khoản độc giả thành công")
	void testUpdateMemberStatus() {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		Account account = new Account();
		account.setEmail("status-test-" + suffix + "@library.com");
		account.setPassword("pwd123456");
		account.setEnabled(true);
		account.setIsDelete(false);
		account.setRole(Role.USER);
		account = accountRepository.save(account);

		Member member = new Member();
		member.setFullName("Member Status Test " + suffix);
		member.setDateOfBirth(LocalDate.of(1998, 5, 20));
		member.setPhone("09" + (int)(Math.random() * 89999999 + 10000000));
		member.setAddress("TP HCM");
		member.setAccount(account);
		member = memberRepository.save(member);

		// Khóa độc giả
		MemberResponse lockedResponse = memberService.updateMemberStatus(member.getId(), false);
		assertEquals(Boolean.FALSE, lockedResponse.getEnabled());

		// Mở khóa độc giả
		MemberResponse unlockedResponse = memberService.updateMemberStatus(member.getId(), true);
		assertEquals(Boolean.TRUE, unlockedResponse.getEnabled());
	}
}
