export = test;
/**
 * @param {any} block
 * @param {any} expected
 */
declare function test(block: any, expected: any): void;
declare namespace test {
    export { BlockPorcelain, BlockHeaderPorcelain };
}
type BlockPorcelain = import('../interface').BlockPorcelain;
type BlockHeaderPorcelain = import('../interface').BlockHeaderPorcelain;
//# sourceMappingURL=test.d.ts.map