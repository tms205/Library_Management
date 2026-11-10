package com.librarymanagement.repository;

import java.util.List;
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

	// Tìm các tài khoản đang hoạt động sở hữu quyền cụ thể (ví dụ BORROW_APPROVE, RETURN_CONFIRM)
	@Query("SELECT DISTINCT a FROM Account a " +
		   "JOIN a.permissionGroups pg " +
		   "JOIN pg.permissions p " +
		   "WHERE p.name = :permissionName " +
		   "AND a.enabled = true " +
		   "AND (a.isDelete IS NULL OR a.isDelete = false)")
	List<Account> findActiveAccountsByPermissionName(@Param("permissionName") String permissionName);

	// Lấy danh sách tên quyền hiệu lực hiện hành của tài khoản trực tiếp từ cơ sở dữ liệu
	@Query("SELECT DISTINCT p.name FROM Account a " +
		   "JOIN a.permissionGroups pg " +
		   "JOIN pg.permissions p " +
		   "WHERE a.email = :email " +
		   "AND a.enabled = true " +
		   "AND (a.isDelete IS NULL OR a.isDelete = false)")
	List<String> findActivePermissionNamesByEmail(@Param("email") String email);

	// Tìm danh sách tài khoản thuộc một nhóm quyền cụ thể
	@Query("SELECT a FROM Account a JOIN a.permissionGroups pg WHERE pg.id = :groupId " +
		   "AND (a.isDelete IS NULL OR a.isDelete = false) ORDER BY a.id ASC")
	Page<Account> findAccountsByPermissionGroupId(@Param("groupId") Long groupId, Pageable pageable);
}
