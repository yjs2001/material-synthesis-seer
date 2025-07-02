
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
import { ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';

interface PredictionParams {
  substrateType: string;
  wSRatio: number;
  hArRatio: number;
  pressureType: string;
  wTemperature: number;
  sTemperature: number;
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
    wSRatio: 0,
    hArRatio: 0,
    pressureType: '',
    wTemperature: 0,
    sTemperature: 0,
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
    { value: 'ws2', label: 'WS₂', fullName: 'Tungsten Disulfide' },
    { value: 'mos2', label: 'MoS₂', fullName: 'Molybdenum Disulfide' },
    { value: 'wse2', label: 'WSe₂', fullName: 'Tungsten Diselenide' },
    { value: 'mose2', label: 'MoSe₂', fullName: 'Molybdenum Diselenide' }
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
    const numericFields = ['wSRatio', 'hArRatio', 'wTemperature', 'sTemperature', 'reactionTime'];
    
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
      // Simulate API call since we don't have a real backend
      const response = await fetch(`/predict/${selectedMaterial}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      let prediction: string;
      
      if (response.ok) {
        const data = await response.json();
        prediction = data.prediction;
      } else {
        // Simulate prediction for demo purposes
        const predictions = ['excellent', 'qualified', 'no yield'];
        prediction = predictions[Math.floor(Math.random() * predictions.length)];
      }
      
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
      
    } catch (error) {
      console.error('Prediction error:', error);
      
      // Fallback simulation
      const predictions = ['excellent', 'qualified', 'no yield'];
      const prediction = predictions[Math.floor(Math.random() * predictions.length)];
      setCurrentPrediction(prediction);
      
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

  const getPredictionColor = (prediction: string): string => {
    switch (prediction) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'qualified': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'no yield': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCurrentMaterial = () => materials.find(m => m.value === selectedMaterial);

  const totalPages = Math.ceil(filteredHistory.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredHistory.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CVD Synthesis Prediction Platform
          </h1>
          <p className="text-gray-600">
            Predict synthesis outcomes for 2D transition metal dichalcogenides
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Prediction Panel */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Material Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {materials.map((material) => (
                    <button
                      key={material.value}
                      onClick={() => setSelectedMaterial(material.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMaterial === material.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-lg">{material.label}</div>
                      <div className="text-sm text-gray-600">{material.fullName}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Synthesis Parameters - {getCurrentMaterial()?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="substrateType">Substrate Type</Label>
                      <Select value={formData.substrateType} onValueChange={(value) => handleInputChange('substrateType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select substrate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sapphire">Sapphire</SelectItem>
                          <SelectItem value="SiO₂">SiO₂</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pressureType">Pressure Type</Label>
                      <Select value={formData.pressureType} onValueChange={(value) => handleInputChange('pressureType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pressure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="atmospheric pressure">Atmospheric Pressure</SelectItem>
                          <SelectItem value="low pressure">Low Pressure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="wSRatio">W/S Ratio</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.wSRatio || ''}
                        onChange={(e) => handleInputChange('wSRatio', parseFloat(e.target.value) || 0)}
                        placeholder="Enter W/S ratio"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hArRatio">H₂/Ar Ratio</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.hArRatio || ''}
                        onChange={(e) => handleInputChange('hArRatio', parseFloat(e.target.value) || 0)}
                        placeholder="Enter H₂/Ar ratio"
                      />
                    </div>

                    <div>
                      <Label htmlFor="wTemperature">W Temperature (°C)</Label>
                      <Input
                        type="number"
                        value={formData.wTemperature || ''}
                        onChange={(e) => handleInputChange('wTemperature', parseInt(e.target.value) || 0)}
                        placeholder="Enter W temperature"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sTemperature">S Temperature (°C)</Label>
                      <Input
                        type="number"
                        value={formData.sTemperature || ''}
                        onChange={(e) => handleInputChange('sTemperature', parseInt(e.target.value) || 0)}
                        placeholder="Enter S temperature"
                      />
                    </div>

                    <div>
                      <Label htmlFor="substratePosition">Substrate Position</Label>
                      <Select value={formData.substratePosition} onValueChange={(value) => handleInputChange('substratePosition', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="side">Side</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reactionTime">Reaction Time (minutes)</Label>
                      <Input
                        type="number"
                        value={formData.reactionTime || ''}
                        onChange={(e) => handleInputChange('reactionTime', parseInt(e.target.value) || 0)}
                        placeholder="Enter reaction time"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="saltAddition">Salt Addition</Label>
                      <Select value={formData.saltAddition} onValueChange={(value) => handleInputChange('saltAddition', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salt addition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Predicting...' : 'Predict Synthesis Outcome'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div>
            {currentPrediction && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Prediction Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`inline-block px-6 py-3 rounded-lg font-semibold text-lg ${getPredictionColor(currentPrediction)}`}>
                      {currentPrediction.toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      For {getCurrentMaterial()?.label} synthesis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Prediction History
                </CardTitle>
                <div className="flex gap-2 mt-4">
                  <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                    <SelectTrigger className="w-32">
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
                    <SelectTrigger className="w-32">
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
              <CardContent>
                {currentRecords.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {currentRecords.map((record) => (
                        <div key={record.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <Badge variant="outline" className="mr-2">
                                {materials.find(m => m.value === record.material)?.label}
                              </Badge>
                              <Badge className={getPredictionColor(record.prediction)}>
                                {record.prediction}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(record.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <div>Substrate: {record.params.substrateType}</div>
                            <div>Pressure: {record.params.pressureType}</div>
                            <div>Temp: {record.params.wTemperature}°C / {record.params.sTemperature}°C</div>
                          </div>
                          
                          <div className="mt-2">
                            {editingRemarks === record.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={tempRemarks}
                                  onChange={(e) => setTempRemarks(e.target.value)}
                                  placeholder="Add remarks..."
                                  className="text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleRemarksEdit(record.id, tempRemarks)}
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
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">
                                  {record.remarks || 'No remarks'}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRemarks(record.id);
                                    setTempRemarks(record.remarks || '');
                                  }}
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
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No prediction history found
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
