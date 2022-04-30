import { createHash } from 'crypto';
import { Message } from '../common/message.enum';

/**
 * 截取字符串为指定长度，超过长度加'...'
 * @param {string} srcStr 源字符串
 * @param {number} cutLength 指定长度
 * @return {string} 截取结果字符串
 * @version 1.0.0
 * @since 1.0.0
 */
export function cutStr(srcStr: string, cutLength: number) {
  let resultStr;
  let i = 0;
  let n = 0;
  let curChar;
  const half = 0.5;

  while (n < cutLength && i < srcStr.length) {
    curChar = srcStr.charCodeAt(i);
    if (curChar >= 192 || (curChar >= 65 && curChar <= 90)) {// 中文和大写字母计为1个
      n += 1;
      if (n <= cutLength) {
        i += 1;
      }
    } else {// 其余字符计为半个
      n += half;
      i += 1;
    }
  }
  resultStr = srcStr.substring(0, i);
  if (srcStr.length > i) {
    resultStr += '...';
  }
  return resultStr;
}

/**
 * md5加密字符串
 * @param {string} value 源内容
 * @return {string} 加密结果
 * @version 1.0.0
 * @since 1.0.0
 */
export function getMd5(value: string) {
  return createHash('md5').update(value).digest('hex');
}

/**
 * 生成随机ID字符串：10/11位十六进制时间戳+6/5位十六进制随机数
 * @return {string} ID
 * @version 1.0.0
 * @since 1.0.0
 */
export function getUuid() {
  // 1e12 + 0x4ba0000000
  const idLen = 16;
  const hex = 16;
  const timeBased = 1324806901760;// 2011-12-25 17:55:01
  const timeStamp = new Date().getTime() - timeBased;
  const uuid = timeStamp.toString(hex);
  let tmpStr = '';

  for (let idx = 0; idx < idLen - uuid.length; idx += 1) {
    tmpStr += Math.floor(Math.random() * hex).toString(hex);
  }

  return uuid + tmpStr;
}

/**
 * 判断是否空对象
 * @param {Object} obj 源对象
 * @return {boolean} 判断结果：为空返回true，否则返回false
 * @version 1.0.0
 * @since 1.0.0
 */
export function isEmptyObject(obj: Object) {
  for (let name in obj) {
    if (obj.hasOwnProperty(name)) {
      return false;
    }
  }
  return true;
}

export function getFileExt(fileName: string): string {
  let partials = fileName.split('.');
  let fileExt: string = '';
  if (partials.length > 1) {
    fileExt = '.' + partials.pop();
  } else {
    fileExt = '';
  }
  return fileExt;
}

/**
 * 格式化字符串
 * e.g. input: format('Hello $0, $1.', 'World', 'Fuyun')
 *      output: Hello World, Fuyun.
 *   or input: format('Hello $0, $1.', ['World', 'Fuyun'])
 *      output the same: Hello World, Fuyun.
 * Notice:
 *     When replacement is not supplied or is undefined,
 *     it will be replaced with empty string('')
 * @param {string} str source string
 * @param {(string | number)[]} params replacements
 * @return {string} output string
 */
export function format(str: string, ...params: (string | number)[]): Message {
  if (Array.isArray(params[0])) {
    params = params[0];
  }
  return <Message>str.replace(/\$(\d+)/ig, (matched, index) =>
    params[index] && params[index].toString() || matched
  );
}
