#!/usr/bin/env python3
"""
DocHub Password Hashing CLI
Script tiện ích giúp tạo chuỗi hash bcrypt cho mật khẩu đăng nhập của DocHub.

Sử dụng:
    python scripts/hash_password.py "your_secret_password"
"""

import sys

try:
    import bcrypt
except ImportError:
    print("[-] Thư viện 'bcrypt' chưa được cài đặt.")
    print("    Vui lòng cài đặt: pip install bcrypt")
    sys.exit(1)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def main():
    if len(sys.argv) < 2:
        print("Sử dụng: python scripts/hash_password.py <mat_khau>")
        print('Ví dụ:   python scripts/hash_password.py "MySecurePassword123!"')
        sys.exit(1)

    password = sys.argv[1]
    hashed = hash_password(password)
    print("\n[+] Đã tạo hash mật khẩu thành công!")
    print("-" * 60)
    print(f"Password: {password}")
    print(f"Hash:     {hashed}")
    print("-" * 60)
    print("\nHãy sao chép chuỗi Hash ở trên và dán vào file .env:")
    print(f"APP_PASSWORD_HASH={hashed}\n")


if __name__ == "__main__":
    main()
