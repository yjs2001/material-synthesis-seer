import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Filter, Plus, Beaker, Trash2 } from 'lucide-react';
import universityLogo from '@/assets/university-logo.png';

interface PredictionParams {
  substrateType: string;
  metalChalcogenRatio: number;
  hArRatio: number;
  pressureType: string;
  metalTemperature: number;
  chalcogenTemperature: number;
  substratePosition: string;
  reactionTime: number;
  saltAddition: string;
}

interface PredictionRecord {
  id: string;
  material: string;
  params: PredictionParams;
  prediction: string;
  timestamp: string;
  remarks?: string;
}

const CVDPlatform = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ws2');
  const [formData, setFormData] = useState<PredictionParams>({
    substrateType: '',
    metalChalcogenRatio: 0,
    hArRatio: 0,
    pressureType: '',
    metalTemperature: 0,
    chalcogenTemperature: 0,
    substratePosition: '',
    reactionTime: 0,
    saltAddition: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PredictionRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [filterPrediction, setFilterPrediction] = useState<string>('all');
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState<string>('');

  const materials = [
    { 
      value: 'ws2', 
      label: 'WS₂', 
      fullName: 'Tungsten Disulfide',
      ratio: 'W/S',
      metal: 'W',
      chalcogen: 'S',
      color: 'from-blue-500 to-indigo-600'
    },
    { 
      value: 'mos2', 
      label: 'MoS₂', 
      fullName: 'Molybdenum Disulfide',
      ratio: 'Mo/S',
      metal: 'Mo',
      chalcogen: 'S',
      color: 'from-emerald-500 to-teal-600'
    },
    { 
      value: 'wse2', 
      label: 'WSe₂', 
      fullName: 'Tungsten Diselenide',
      ratio: 'W/Se',
      metal: 'W',
      chalcogen: 'Se',
      color: 'from-purple-500 to-violet-600'
    },
    { 
      value: 'mose2', 
      label: 'MoSe₂', 
      fullName: 'Molybdenum Diselenide',
      ratio: 'Mo/Se',
      metal: 'Mo',
      chalcogen: 'Se',
      color: 'from-orange-500 to-red-600'
    }
  ];

  const recordsPerPage = 10;

  // Load history from cookies on component mount
  useEffect(() => {
    const savedHistory = getCookie('cvd_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        setFilteredHistory(parsed);
      } catch (error) {
        console.error('Error parsing history from cookies:', error);
      }
    }
  }, []);

  // Clear prediction when material changes
  useEffect(() => {
    setCurrentPrediction(null);
  }, [selectedMaterial]);

  // Filter history when filters change
  useEffect(() => {
    let filtered = [...history];
    
    if (filterMaterial !== 'all') {
      filtered = filtered.filter(record => record.material === filterMaterial);
    }
    
    if (filterPrediction !== 'all') {
      filtered = filtered.filter(record => record.prediction === filterPrediction);
    }
    
    setFilteredHistory(filtered);
    setCurrentPage(1);
  }, [history, filterMaterial, filterPrediction]);

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const setCookie = (name: string, value: string, days: number = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const handleInputChange = (field: keyof PredictionParams, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const requiredFields = ['substrateType', 'pressureType', 'substratePosition', 'saltAddition'];
    const numericFields = ['metalChalcogenRatio', 'hArRatio', 'metalTemperature', 'chalcogenTemperature', 'reactionTime'];
    
    for (const field of requiredFields) {
      if (!formData[field as keyof PredictionParams]) {
        toast({
          title: "Validation Error",
          description: `Please select ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    for (const field of numericFields) {
      const value = formData[field as keyof PredictionParams];
      if (typeof value === 'number' && (value <= 0 || isNaN(value))) {
        toast({
          title: "Validation Error",
          description: `Please enter a valid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setCurrentPrediction(null);
    
    try {
      // Map material values to API endpoints
      const materialMap: { [key: string]: string } = {
        'ws2': 'WSe2',
        'mos2': 'MoS2', 
        'wse2': 'WSe2',
        'mose2': 'MoSe2'
      };
      
      const apiMaterial = materialMap[selectedMaterial] || 'WSe2';
      const apiUrl = `http://127.0.0.1:5000/predict/${apiMaterial}`;
      
      console.log('Sending request to:', apiUrl);
      console.log('Request data:', formData);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        const prediction = data.prediction;
        setCurrentPrediction(prediction);
        
        // Add to history
        const newRecord: PredictionRecord = {
          id: Date.now().toString(),
          material: selectedMaterial,
          params: { ...formData },
          prediction,
          timestamp: new Date().toISOString()
        };
        
        const newHistory = [newRecord, ...history];
        setHistory(newHistory);
        setCookie('cvd_history', JSON.stringify(newHistory));
        
        toast({
          title: "Prediction Complete",
          description: `Result: ${prediction}`,
        });
        
      } else {
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        toast({
          title: "API Error",
          description: `Server returned ${response.status}: ${response.statusText}`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Network error:', error);
      
      toast({
        title: "Network Error",
        description: "Failed to connect to the prediction server. Please check if the server is running.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemarksEdit = (recordId: string, remarks: string) => {
    const updatedHistory = history.map(record => 
      record.id === recordId ? { ...record, remarks } : record
    );
    setHistory(updatedHistory);
    setCookie('cvd_history', JSON.stringify(updatedHistory));
    setEditingRemarks(null);
    setTempRemarks('');
  };

  const handleDeleteRecord = (recordId: string) => {
    const updatedHistory = history.filter(record => record.id !== recordId);
    setHistory(updatedHistory);
    setCookie('cvd_history', JSON.stringify(updatedHistory));
    
    toast({
      title: "Record Deleted",
      description: "Prediction record has been removed from history.",
    });
  };

  const getPredictionColor = (prediction: string): string => {
    switch (prediction) {
      case 'excellent': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
      case 'qualified': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
      case 'no yield': return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-100';
    }
  };

  const getCurrentMaterial = () => materials.find(m => m.value === selectedMaterial);

  const totalPages = Math.ceil(filteredHistory.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredHistory.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center mb-6">
            <img 
              src={universityLogo} 
              alt="Zhejiang University Logo" 
              className="h-28 w-28 object-contain mb-4"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              CVD Synthesis Prediction Platform
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Advanced prediction system for 2D transition metal dichalcogenide synthesis outcomes
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Prediction Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Beaker className="h-5 w-5 text-blue-600" />
                  Material Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {materials.map((material) => (
                    <button
                      key={material.value}
                      onClick={() => setSelectedMaterial(material.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 group ${
                        selectedMaterial === material.value
                          ? `border-transparent bg-gradient-to-br ${material.color} text-white shadow-lg transform scale-105`
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md hover:scale-102'
                      }`}
                    >
                      <div className={`font-bold text-lg mb-1 ${
                        selectedMaterial === material.value ? 'text-white' : 'text-slate-800'
                      }`}>
                        {material.label}
                      </div>
                      <div className={`text-sm ${
                        selectedMaterial === material.value ? 'text-white/90' : 'text-slate-600'
                      }`}>
                        {material.fullName}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
                <CardTitle className="text-slate-800">
                  Synthesis Parameters - {getCurrentMaterial()?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="substrateType" className="text-slate-700 font-medium">Substrate Type</Label>
                      <Select value={formData.substrateType} onValueChange={(value) => handleInputChange('substrateType', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100">
                          <SelectValue placeholder="Select substrate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sapphire">Sapphire</SelectItem>
                          <SelectItem value="SiO₂">SiO₂</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pressureType" className="text-slate-700 font-medium">Pressure Type</Label>
                      <Select value={formData.pressureType} onValueChange={(value) => handleInputChange('pressureType', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100">
                          <SelectValue placeholder="Select pressure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="atmospheric pressure">Atmospheric Pressure</SelectItem>
                          <SelectItem value="low pressure">Low Pressure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metalChalcogenRatio" className="text-slate-700 font-medium">
                        {getCurrentMaterial()?.ratio} Ratio
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.metalChalcogenRatio || ''}
                        onChange={(e) => handleInputChange('metalChalcogenRatio', parseFloat(e.target.value) || 0)}
                        placeholder={`Enter ${getCurrentMaterial()?.ratio} ratio`}
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hArRatio" className="text-slate-700 font-medium">H₂/Ar Ratio</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.hArRatio || ''}
                        onChange={(e) => handleInputChange('hArRatio', parseFloat(e.target.value) || 0)}
                        placeholder="Enter H₂/Ar ratio"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metalTemperature" className="text-slate-700 font-medium">
                        {getCurrentMaterial()?.metal} Temperature (°C)
                      </Label>
                      <Input
                        type="number"
                        value={formData.metalTemperature || ''}
                        onChange={(e) => handleInputChange('metalTemperature', parseInt(e.target.value) || 0)}
                        placeholder={`Enter ${getCurrentMaterial()?.metal} temperature`}
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chalcogenTemperature" className="text-slate-700 font-medium">
                        {getCurrentMaterial()?.chalcogen} Temperature (°C)
                      </Label>
                      <Input
                        type="number"
                        value={formData.chalcogenTemperature || ''}
                        onChange={(e) => handleInputChange('chalcogenTemperature', parseInt(e.target.value) || 0)}
                        placeholder={`Enter ${getCurrentMaterial()?.chalcogen} temperature`}
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="substratePosition" className="text-slate-700 font-medium">Substrate Position</Label>
                      <Select value={formData.substratePosition} onValueChange={(value) => handleInputChange('substratePosition', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="side">Side</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reactionTime" className="text-slate-700 font-medium">Reaction Time (minutes)</Label>
                      <Input
                        type="number"
                        value={formData.reactionTime || ''}
                        onChange={(e) => handleInputChange('reactionTime', parseInt(e.target.value) || 0)}
                        placeholder="Enter reaction time"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="saltAddition" className="text-slate-700 font-medium">Salt Addition</Label>
                      <Select value={formData.saltAddition} onValueChange={(value) => handleInputChange('saltAddition', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100">
                          <SelectValue placeholder="Select salt addition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Predicting...
                      </div>
                    ) : 'Predict Synthesis Outcome'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {currentPrediction && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
                  <CardTitle className="text-slate-800">Prediction Result</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`inline-block px-8 py-4 rounded-xl font-bold text-xl border-2 shadow-lg ${getPredictionColor(currentPrediction)}`}>
                      {currentPrediction.toUpperCase()}
                    </div>
                    <p className="text-slate-600 mt-3 font-medium">
                      For {getCurrentMaterial()?.label} synthesis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Panel */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Prediction History
                </CardTitle>
                <div className="flex gap-3 mt-4">
                  <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                    <SelectTrigger className="w-36 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {materials.map(material => (
                        <SelectItem key={material.value} value={material.value}>
                          {material.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPrediction} onValueChange={setFilterPrediction}>
                    <SelectTrigger className="w-32 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="no yield">No Yield</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {currentRecords.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {currentRecords.map((record) => (
                        <div key={record.id} className="border border-slate-200 rounded-xl p-4 bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="border-slate-300 text-slate-700">
                                {materials.find(m => m.value === record.material)?.label}
                              </Badge>
                              <Badge className={`border-2 ${getPredictionColor(record.prediction)}`}>
                                {record.prediction}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                {new Date(record.timestamp).toLocaleString()}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-slate-600 mb-3 grid grid-cols-2 gap-2">
                            <div><span className="font-medium">Substrate:</span> {record.params.substrateType}</div>
                            <div><span className="font-medium">Pressure:</span> {record.params.pressureType}</div>
                            <div><span className="font-medium">Metal Temp:</span> {record.params.metalTemperature}°C</div>
                            <div><span className="font-medium">Chalcogen Temp:</span> {record.params.chalcogenTemperature}°C</div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            {editingRemarks === record.id ? (
                              <div className="space-y-3">
                                <Textarea
                                  value={tempRemarks}
                                  onChange={(e) => setTempRemarks(e.target.value)}
                                  placeholder="Add remarks..."
                                  className="text-sm bg-white border-slate-200"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleRemarksEdit(record.id, tempRemarks)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditingRemarks(null);
                                      setTempRemarks('');
                                    }}
                                    className="border-slate-300"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-700 flex-1">
                                  {record.remarks || 'No remarks'}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRemarks(record.id);
                                    setTempRemarks(record.remarks || '');
                                  }}
                                  className="text-slate-500 hover:text-slate-700"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="border-slate-300"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="border-slate-300"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500 py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Filter className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium">No prediction history found</p>
                    <p className="text-sm mt-1">Start by making your first prediction</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVDPlatform;
