#!/bin/bash
# セキュリティチェックスクリプト

set -e

echo "🔒 Running security checks..."

# 除外するパターンを定義
EXCLUDE_DIRS="tests|vendor|node_modules|\.git"
EXCLUDE_FILES="*Test.php|*test*.php|*test*.js|api_keys.json"

# 1. 実際のAPIキーパターンをチェック（テストファイル除外）
echo "Checking for hardcoded API keys..."
if find . -type f \( -name "*.php" -o -name "*.js" \) \
   ! -path "./tests/*" \
   ! -path "./vendor/*" \
   ! -name "*Test.php" \
   ! -name "*test*.php" \
   ! -name "*test*.js" \
   ! -name "api_keys.json" \
   -exec grep -l "sk-[a-zA-Z0-9]\{10,\}" {} \; \
   | xargs -r grep "sk-[a-zA-Z0-9]" \
   | grep -v "placeholder\|sk-\.\.\.\|sk-ant-\.\.\.\|console\.log\|//" \
   | grep . ; then
    echo "⚠️ Potential hardcoded API keys found in production code"
    exit 1
fi

# 2. 環境変数の漏洩チェック
echo "Checking for exposed environment variables..."
if find . -type f \( -name "*.php" -o -name "*.js" \) \
   ! -path "./tests/*" \
   ! -path "./vendor/*" \
   -exec grep -l "\$_ENV\|\$_SERVER\|process\.env" {} \; \
   | xargs -r grep -n "\$_ENV\[.*\]\|\$_SERVER\[.*\]\|process\.env\." \
   | grep -v "//.*\|/\*.*\*/\|config\.php\|setup\.php" \
   | grep . ; then
    echo "ℹ️ Environment variable usage found (review for sensitive data)"
fi

# 3. SQLインジェクション脆弱性チェック
echo "Checking for SQL injection vulnerabilities..."
if find . -type f -name "*.php" \
   ! -path "./tests/*" \
   ! -path "./vendor/*" \
   -exec grep -l "SELECT\|INSERT\|UPDATE\|DELETE" {} \; \
   | xargs -r grep -n "SELECT.*\$\|INSERT.*\$\|UPDATE.*\$\|DELETE.*\$" \
   | grep -v "//.*\|/\*.*\*/" \
   | grep . ; then
    echo "⚠️ Potential SQL injection patterns found"
    exit 1
fi

# 4. デバッグ情報の漏洩チェック
echo "Checking for debug information..."
if find . -type f \( -name "*.php" -o -name "*.js" \) \
   ! -path "./tests/*" \
   ! -path "./vendor/*" \
   -exec grep -l "var_dump\|print_r\|console\.log\|alert(" {} \; \
   | xargs -r grep -n "var_dump\|print_r\|console\.log\|alert(" \
   | grep -v "//.*\|/\*.*\*/\|debug\.php" \
   | grep . ; then
    echo "ℹ️ Debug statements found (consider removing for production)"
fi

echo "✅ Security checks completed successfully"