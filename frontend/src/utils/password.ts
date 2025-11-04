import sha from 'js-sha256';

/**
 * 在前端对密码进行哈希处理
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return sha.sha256(password)
  } catch (error) {
    console.error('密码哈希失败:', error);
    throw new Error('密码处理失败');
  }
}

/**
 * 验证密码（主要用于注册时的密码确认）
 * @param password 明文密码
 * @param hashedPassword 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
}

/**
 * 生成密码强度检查
 * @param password 密码
 * @returns 强度评分和提示
 */
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('密码长度至少8位');
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('包含小写字母');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('包含大写字母');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('包含数字');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('包含特殊字符');
  }

  return { score, feedback };
}