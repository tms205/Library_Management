package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.Account;

//repository này quản lý entity account
public interface AccountRepository extends JpaRepository<Account, Long> {

	// tìm account theo field email
	Optional<Account> findByEmail(String email);

	// kiểm tra xem email đã tồn tại chưa
	boolean existsByEmail(String email);

	// Tìm kiếm danh sách tài khoản phục vụ phân quyền (lọc bỏ tài khoản đã xóa mềm)
	@Query("SELECT a FROM Account a WHERE (a.isDelete IS NULL OR a.isDelete = false) " +
		   "AND (:search IS NULL OR :search = '' OR LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
		   "ORDER BY a.id ASC")
	Page<Account> searchAccountsForRoleManagement(@Param("search") String search, Pageable pageable);
}
