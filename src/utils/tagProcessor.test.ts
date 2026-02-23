import { processGenreTags } from './tagProcessor';

describe('processGenreTags', () => {
  it('should remove emojis and split by slash', () => {
    const input = ["💕 로맨스 / 로코", "😂 코미디"];
    const expected = ["로맨스", "로코", "코미디"];
    expect(processGenreTags(input)).toEqual(expected);
  });

  it('should handle tags without slashes', () => {
    const input = ["👊 액션", "👽 SF"];
    const expected = ["액션", "SF"];
    expect(processGenreTags(input)).toEqual(expected);
  });

  it('should remove duplicates', () => {
    const input = ["💕 로맨스 / 로코", "💕 로맨스"];
    const expected = ["로맨스", "로코"];
    expect(processGenreTags(input)).toEqual(expected);
  });

  it('should handle empty array', () => {
    const input: string[] = [];
    const expected: string[] = [];
    expect(processGenreTags(input)).toEqual(expected);
  });

  it('should handle multiple slashes', () => {
    const input = ["😢 드라마 / 휴먼 / 가족"];
    const expected = ["드라마", "휴먼", "가족"];
    expect(processGenreTags(input)).toEqual(expected);
  });

  it('should trim whitespace', () => {
    const input = ["  💕  로맨스  /  로코  "];
    const expected = ["로맨스", "로코"];
    expect(processGenreTags(input)).toEqual(expected);
  });
});
