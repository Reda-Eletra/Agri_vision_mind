const pool = require('./config/database');
const syncService = require('./services/growthGuideSyncService');
const adminController = require('./controllers/adminController');
const growthGuideController = require('./controllers/growthGuideController');
const { v4: uuidv4 } = require('uuid');

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Test Failure: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
};

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  res.send = (data) => {
    res.sendData = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  console.log('🏁 Starting Botanical Hub & Admin Rebuild Test Suite...\n');

  try {
    // ────────── TEST 1: Database Setup & Schema Verification ──────────
    console.log('🔍 Test 1: Verifying Database Schema & Migration Columns...');
    await pool.ensureSchema();
    
    // Check that growth_guides has bilingual and soft-delete columns
    const columnsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'growth_guides'
    `);
    const colNames = columnsCheck.rows.map(r => r.column_name);
    
    assert(colNames.includes('name_en'), 'growth_guides should have name_en column');
    assert(colNames.includes('name_ar'), 'growth_guides should have name_ar column');
    assert(colNames.includes('summary_en'), 'growth_guides should have summary_en column');
    assert(colNames.includes('summary_ar'), 'growth_guides should have summary_ar column');
    assert(colNames.includes('deleted_at'), 'growth_guides should have deleted_at column for soft deletes');
    assert(colNames.includes('is_visible'), 'growth_guides should have is_visible column for hiding/showing');
    
    // Check sync_logs table
    const syncLogsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sync_logs'
    `);
    const syncLogCols = syncLogsCheck.rows.map(r => r.column_name);
    assert(syncLogCols.includes('status'), 'sync_logs should have status column');
    assert(syncLogCols.includes('scanned_count'), 'sync_logs should have scanned_count column');
    assert(syncLogCols.includes('error_message'), 'sync_logs should have error_message column');

    // ────────── TEST 2: Static Fallback when Database is Empty ──────────
    console.log('\n🔍 Test 2: Verifying Static Fallback when DB is empty...');
    // Temporarily clear table
    await pool.query('DELETE FROM growth_guides');
    
    let req = { query: {}, headers: { 'accept-language': 'en' } };
    let res = mockRes();
    
    await growthGuideController.getPlants(req, res);
    assert(res.jsonData && res.jsonData.message.includes('Static Fallback'), 'Should fall back to static list when DB is empty');
    assert(res.jsonData.data.length > 0, 'Static fallback list should return data');
    
    // Test that localized Arabic requested does not fall back to English values
    req = { query: {}, headers: { 'accept-language': 'ar' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(res.jsonData.data[0].name === 'طماطم', 'Static fallback should return Arabic name when language header is Arabic');
    
    // ────────── TEST 3: Admin CRUD & Database Insertion ──────────
    console.log('\n🔍 Test 3: Verifying Admin CRUD & Database Insertion...');
    const guideId = uuidv4();
    req = {
      body: {
        name_en: 'Test Plant',
        name_ar: 'نبات تجريبي',
        scientific_name: 'Testus plantus',
        category: 'vegetables',
        summary_en: 'Test summary english',
        summary_ar: 'ملخص تجريبي عربي',
        description_en: 'Test description english',
        description_ar: 'وصف تجريبي عربي',
        image_url: 'https://example.com/test-plant.jpg',
        sunlight_en: 'Full sun',
        sunlight_ar: 'شمس كاملة',
        soil_en: 'Neutral soil',
        soil_ar: 'تربة متعادلة',
        watering_en: 'Daily',
        watering_ar: 'يوميا'
      }
    };
    res = mockRes();
    // Inject custom ID into req.body just for predictability, but our controller generates a new one.
    // Let's call createAdminGrowthGuide
    await adminController.createAdminGrowthGuide(req, res);
    assert(res.statusCode === 201, 'Admin should be able to create a growth guide');
    const createdId = res.jsonData.id;
    assert(createdId, 'Response should contain the generated ID');

    // Fetch created plant from DB to check raw fields
    const rawDbPlant = await pool.query('SELECT * FROM growth_guides WHERE id = $1', [createdId]);
    assert(rawDbPlant.rows.length === 1, 'Plant should exist in database');
    assert(rawDbPlant.rows[0].name_en === 'Test Plant', 'English name should be stored in name_en');
    assert(rawDbPlant.rows[0].name_ar === 'نبات تجريبي', 'Arabic name should be stored in name_ar');
    assert(rawDbPlant.rows[0].deleted_at === null, 'deleted_at should be null by default');
    assert(rawDbPlant.rows[0].is_visible === true, 'is_visible should be true by default');

    // ────────── TEST 4: English vs Arabic API Resolution ──────────
    console.log('\n🔍 Test 4: Verifying English vs Arabic API Resolution...');
    // Public English request
    req = { params: { idOrSlug: createdId }, headers: { 'accept-language': 'en' } };
    res = mockRes();
    await growthGuideController.getPlantByIdOrSlug(req, res);
    assert(res.jsonData.data.name === 'Test Plant', 'English header resolves to name_en');
    assert(res.jsonData.data.summary === 'Test summary english', 'English header resolves to summary_en');

    // Public Arabic request
    req = { params: { idOrSlug: createdId }, headers: { 'accept-language': 'ar' } };
    res = mockRes();
    await growthGuideController.getPlantByIdOrSlug(req, res);
    assert(res.jsonData.data.name === 'نبات تجريبي', 'Arabic header resolves to name_ar');
    assert(res.jsonData.data.summary === 'ملخص تجريبي عربي', 'Arabic header resolves to summary_ar');

    // ────────── TEST 5: Search, Filtering & Pagination ──────────
    console.log('\n🔍 Test 5: Verifying search, filtering and pagination...');
    // Search by English
    req = { query: { search: 'Test' }, headers: { 'accept-language': 'en' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(res.jsonData.data.length > 0, 'Should search on english name');
    assert(res.jsonData.data[0].id === createdId, 'Should find the test plant');

    // Search by Arabic
    req = { query: { search: 'تجريبي' }, headers: { 'accept-language': 'ar' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(res.jsonData.data.length > 0, 'Should search on arabic name');

    // Filter by Category
    req = { query: { category: 'vegetables' }, headers: { 'accept-language': 'en' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(res.jsonData.data.length > 0, 'Should filter by category');

    // ────────── TEST 6: Soft Delete, Visibility & Trash Bin ──────────
    console.log('\n🔍 Test 6: Verifying soft deletes, visibility toggles, and trash bin...');
    // Toggle visibility to hidden
    req = { params: { id: createdId } };
    res = mockRes();
    await adminController.toggleVisibilityAdminGrowthGuide(req, res);
    assert(res.jsonData.is_visible === false, 'Visibility should toggle to false');

    // Verify it is hidden from public API
    req = { query: {}, headers: { 'accept-language': 'en' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(!res.jsonData.data.some(p => p.id === createdId), 'Hidden plant should not be returned in public API');

    // Toggle back to visible
    req = { params: { id: createdId } };
    res = mockRes();
    await adminController.toggleVisibilityAdminGrowthGuide(req, res);
    assert(res.jsonData.is_visible === true, 'Visibility should toggle to true');

    // Soft delete it
    req = { params: { id: createdId }, query: {} };
    res = mockRes();
    await adminController.deleteAdminGrowthGuide(req, res);
    assert(res.jsonData.message.includes('Trash'), 'Delete should move guide to Trash');

    // Verify it is not returned in public API
    req = { query: {}, headers: { 'accept-language': 'en' } };
    res = mockRes();
    await growthGuideController.getPlants(req, res);
    assert(!res.jsonData.data.some(p => p.id === createdId), 'Soft deleted plant should not show in public list');

    // Verify it is not returned in normal admin list
    req = { query: { trash: 'false' } };
    res = mockRes();
    await adminController.getAdminGrowthGuides(req, res);
    assert(!res.jsonData.data.some(p => p.id === createdId), 'Soft deleted plant should not show in normal admin list');

    // Verify it IS returned in admin trash list
    req = { query: { trash: 'true' } };
    res = mockRes();
    await adminController.getAdminGrowthGuides(req, res);
    assert(res.jsonData.data.some(p => p.id === createdId), 'Soft deleted plant should show in admin trash list');

    // Restore it
    req = { params: { id: createdId }, body: { restore: true } };
    res = mockRes();
    await adminController.updateAdminGrowthGuide(req, res);
    assert(res.statusCode !== 404, 'Restore should successfully update guide');

    // Verify restored is back in normal admin list
    req = { query: { trash: 'false' } };
    res = mockRes();
    await adminController.getAdminGrowthGuides(req, res);
    assert(res.jsonData.data.some(p => p.id === createdId), 'Restored plant should show back in normal admin list');

    // ────────── TEST 7: Resilient Crawler & Sync Logs ──────────
    console.log('\n🔍 Test 7: Verifying crawler sync_logs reporting...');
    
    // Trigger sync once
    console.log('⚙️ Simulating manual sync run...');
    req = {};
    res = mockRes();
    await adminController.syncAdminGrowthGuides(req, res);
    assert(res.jsonData.message.includes('triggered'), 'Should successfully trigger sync');
    
    // Wait a brief moment and fetch sync status logs
    await new Promise(resolve => setTimeout(resolve, 500));
    
    req = {};
    res = mockRes();
    await adminController.getAdminGrowthGuidesSyncStatus(req, res);
    assert(res.jsonData.data.logs.length > 0, 'Database sync logs should contain sync execution records');
    
    const latestLog = res.jsonData.data.logs[0];
    console.log(`📊 Latest Sync Run: Status = ${latestLog.status}, Scanned = ${latestLog.scanned_count}, Created = ${latestLog.created_count}, Updated = ${latestLog.updated_count}`);
    assert(['completed', 'running', 'partial_success', 'failed'].includes(latestLog.status), 'Sync status should be valid');

    console.log('\n🎉 All automated growth guide & admin rebuild tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Execution Error in test suite:', error);
    process.exit(1);
  }
};

runTests();
