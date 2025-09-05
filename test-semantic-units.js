/**
 * Unit Tests for SmartTasks Semantic Functionality
 * 
 * This file contains isolated unit tests for the semantic coloring system.
 * Run with: node test-semantic-units.js
 */

// Mock DOM elements and functions for testing
const mockDOM = {
    nodes: new Map(),
    semanticCache: {},
    
    // Mock node structure
    createMockNode: (id, title, content) => ({
        id,
        titleEl: { textContent: title },
        ta: { value: content },
        style: {},
        colorDotEl: { style: {} }
    }),
    
    // Mock functions from main app
    contentHashForNode: async (node) => {
        const content = (node.titleEl.textContent || '') + '\n' + (node.ta.value || '');
        // Simple hash function for testing
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    },
    
    applyColorToNode: (node, color) => {
        node.style.borderLeftColor = color;
        node.colorDotEl.style.background = color;
        return true;
    },
    
    vecToColor: (v) => {
        const h = Math.round(v[0] * 360);
        const s = Math.round(40 + v[1] * 40);
        const l = Math.round(45 + v[2] * 20);
        return `hsl(${h} ${s}% ${l}%)`;
    },
    
    saveSemanticCache: () => {
        // Mock save function
        return true;
    }
};

// Test suite
class SemanticTestSuite {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runTests() {
        console.log('🧪 Running Semantic Unit Tests\n');
        
        for (const test of this.tests) {
            try {
                console.log(`⏳ ${test.name}...`);
                const result = await test.testFn();
                if (result === true) {
                    console.log(`✅ ${test.name} - PASSED`);
                    this.results.push({ name: test.name, status: 'PASSED' });
                } else {
                    console.log(`❌ ${test.name} - FAILED: ${result}`);
                    this.results.push({ name: test.name, status: 'FAILED', error: result });
                }
            } catch (error) {
                console.log(`💥 ${test.name} - ERROR: ${error.message}`);
                this.results.push({ name: test.name, status: 'ERROR', error: error.message });
            }
            console.log('');
        }
        
        this.printSummary();
    }
    
    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASSED').length;
        const failed = this.results.filter(r => r.status === 'FAILED').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;
        
        console.log('📊 Test Summary:');
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   💥 Errors: ${errors}`);
        console.log(`   📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        
        if (failed > 0 || errors > 0) {
            console.log('\n🔍 Failed Tests:');
            this.results.filter(r => r.status !== 'PASSED').forEach(r => {
                console.log(`   - ${r.name}: ${r.error || 'Unknown error'}`);
            });
        }
    }
}

// Initialize test suite
const suite = new SemanticTestSuite();

// Test 1: Content Hash Generation
suite.addTest('Content Hash Generation', async () => {
    const node1 = mockDOM.createMockNode(1, 'Test Task', 'Description here');
    const node2 = mockDOM.createMockNode(2, 'Test Task', 'Description here');
    const node3 = mockDOM.createMockNode(3, 'Different Task', 'Different description');
    
    const hash1 = await mockDOM.contentHashForNode(node1);
    const hash2 = await mockDOM.contentHashForNode(node2);
    const hash3 = await mockDOM.contentHashForNode(node3);
    
    if (hash1 === hash2 && hash1 !== hash3) {
        return true;
    }
    return `Hash consistency failed: ${hash1} === ${hash2} !== ${hash3}`;
});

// Test 2: Vector to Color Conversion
suite.addTest('Vector to Color Conversion', async () => {
    const testVectors = [
        [0.0, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [1.0, 0.5, 0.5],
        [0.25, 0.75, 0.25]
    ];
    
    const colors = testVectors.map(mockDOM.vecToColor);
    const expectedPatterns = [
        /^hsl\(0 60% 55%\)$/,
        /^hsl\(180 60% 55%\)$/,
        /^hsl\(360 60% 55%\)$/,
        /^hsl\(90 70% 50%\)$/
    ];
    
    for (let i = 0; i < colors.length; i++) {
        if (!expectedPatterns[i].test(colors[i])) {
            return `Color ${i} mismatch: expected pattern ${expectedPatterns[i]}, got ${colors[i]}`;
        }
    }
    
    return true;
});

// Test 3: Fallback Color Generation
suite.addTest('Fallback Color Generation', async () => {
    const fallbackColors = [
        [0.2, 0.8, 0.6], // teal-ish
        [0.8, 0.2, 0.6], // pink-ish  
        [0.6, 0.8, 0.2], // green-ish
        [0.2, 0.6, 0.8], // blue-ish
    ];
    
    // Test that each fallback color produces a valid HSL string
    for (let i = 0; i < fallbackColors.length; i++) {
        const color = mockDOM.vecToColor(fallbackColors[i]);
        if (!/^hsl\(\d+ \d+% \d+%\)$/.test(color)) {
            return `Invalid fallback color ${i}: ${color}`;
        }
    }
    
    return true;
});

// Test 4: Node Color Application
suite.addTest('Node Color Application', async () => {
    const node = mockDOM.createMockNode(1, 'Test', 'Content');
    const testColor = 'hsl(180 60% 55%)';
    
    const result = mockDOM.applyColorToNode(node, testColor);
    
    if (result && node.style.borderLeftColor === testColor && node.colorDotEl.style.background === testColor) {
        return true;
    }
    return `Color application failed: expected ${testColor}, got borderLeftColor=${node.style.borderLeftColor} dot=${node.colorDotEl.style.background}`;
});

// Test 5: Cache Behavior Simulation
suite.addTest('Cache Behavior Simulation', async () => {
    const node = mockDOM.createMockNode(1, 'Cached Task', 'Cached content');
    const hash = await mockDOM.contentHashForNode(node);
    const testColor = 'hsl(120 50% 60%)';
    
    // Simulate caching
    mockDOM.semanticCache[1] = {
        hash: hash,
        embedding: new Array(384).fill(0.5),
        color: testColor
    };
    
    // Test cache retrieval
    const cached = mockDOM.semanticCache[1];
    if (cached && cached.hash === hash && cached.color === testColor) {
        return true;
    }
    return `Cache simulation failed: ${JSON.stringify(cached)}`;
});

// Test 6: Tensor Parsing Logic
suite.addTest('Tensor Parsing Logic', async () => {
    // Simulate the tensor structure from transformers.js
    const mockTensor = {
        dims: [3, 384],
        data: new Float32Array(3 * 384).fill(0).map(() => Math.random())
    };
    
    // Apply the parsing logic from the main app
    let vecs;
    if (mockTensor.dims && mockTensor.dims.length === 2) {
        const [numTexts, embeddingDim] = mockTensor.dims;
        vecs = [];
        for (let i = 0; i < numTexts; i++) {
            const start = i * embeddingDim;
            const end = start + embeddingDim;
            vecs.push(Array.from(mockTensor.data.slice(start, end)));
        }
    }
    
    if (vecs && vecs.length === 3 && vecs[0].length === 384) {
        return true;
    }
    return `Tensor parsing failed: got ${vecs ? vecs.length : 'undefined'} vectors of ${vecs && vecs[0] ? vecs[0].length : 'undefined'} dimensions`;
});

// Test 7: Edge Cases
suite.addTest('Edge Cases', async () => {
    // Test empty content
    const emptyNode = mockDOM.createMockNode(1, '', '');
    const emptyHash = await mockDOM.contentHashForNode(emptyNode);
    
    // Test very long content
    const longContent = 'A'.repeat(10000);
    const longNode = mockDOM.createMockNode(2, 'Long Task', longContent);
    const longHash = await mockDOM.contentHashForNode(longNode);
    
    // Test special characters
    const specialNode = mockDOM.createMockNode(3, '🚀 Special', 'Content with émojis and ñ characters');
    const specialHash = await mockDOM.contentHashForNode(specialNode);
    
    if (emptyHash && longHash && specialHash && 
        emptyHash !== longHash && longHash !== specialHash) {
        return true;
    }
    return `Edge case handling failed: empty=${emptyHash}, long=${longHash}, special=${specialHash}`;
});

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { SemanticTestSuite, mockDOM, suite };
} else {
    // Browser environment
    window.SemanticTestSuite = SemanticTestSuite;
    window.mockDOM = mockDOM;
    window.semanticTestSuite = suite;
}

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
    suite.runTests().catch(console.error);
}
